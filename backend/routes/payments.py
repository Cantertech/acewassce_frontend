import os
import uuid
import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from database import get_db

router = APIRouter(prefix="/api/v1/payments", tags=["Payments & Wallet"])

# Package definitions: cost in GHS, and points granted
PACKAGES = {
    "starter": {"amount": 5.00, "points": 50, "name": "Starter Pack (50 Points)"},
    "standard": {"amount": 10.00, "points": 110, "name": "Standard Pack (110 Points)"},
    "pro": {"amount": 20.00, "points": 240, "name": "Pro Pack (240 Points)"}
}

class PaymentInitializeRequest(BaseModel):
    student_id: str
    package_id: str

@router.post("/initialize")
async def initialize_payment(request: PaymentInitializeRequest, db=Depends(get_db)):
    try:
        package_id = request.package_id.lower()
        if package_id not in PACKAGES:
            raise HTTPException(status_code=400, detail="Invalid package selected")

        package = PACKAGES[package_id]
        amount_ghs = package["amount"]
        points_to_credit = package["points"]
        amount_pesewas = int(amount_ghs * 100) # Paystack expects amounts in subunits (pesewas)

        # Get student info to use phone_number or construct dummy email
        student_res = db.table("students").select("full_name, phone_number").eq("id", request.student_id).execute()
        if not student_res.data:
            raise HTTPException(status_code=404, detail="Student profile not found")
        
        student = student_res.data[0]
        # Construct email required by Paystack
        email = f"student_{request.student_id[:8]}@acewassce.com"

        paystack_key = os.environ.get("PAYSTACK_SECRET_KEY")
        if not paystack_key or paystack_key.startswith("sk_live_xxxxxx"):
            # Fallback or development key if none provided
            paystack_key = "sk_test_7fbc75cb8f83b160216b27e8d2e61df3e86c0c22" # Default sandbox keys or live configured

        reference = f"pay_{uuid.uuid4().hex[:12]}"

        # Initialize payment on Paystack
        paystack_url = "https://api.paystack.co/transaction/initialize"
        headers = {
            "Authorization": f"Bearer {paystack_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "email": email,
            "amount": amount_pesewas,
            "reference": reference,
            "currency": "GHS",
            "metadata": {
                "student_id": request.student_id,
                "points": points_to_credit,
                "package_id": package_id
            }
        }

        async with httpx.AsyncClient() as client:
            resp = await client.post(paystack_url, headers=headers, json=payload)
            
        if resp.status_code != 200:
            print("Paystack init error:", resp.status_code, resp.text)
            raise HTTPException(status_code=500, detail="Failed to initialize transaction with Paystack")

        paystack_data = resp.json()
        if not paystack_data.get("status"):
            raise HTTPException(status_code=500, detail="Paystack initialization failed")

        auth_url = paystack_data["data"]["authorization_url"]

        # Insert a pending payment record into Supabase
        db.table("payments").insert({
            "student_id": request.student_id,
            "reference": reference,
            "amount": amount_ghs,
            "currency": "GHS",
            "points": points_to_credit,
            "status": "pending"
        }).execute()

        return {
            "status": "success",
            "authorization_url": auth_url,
            "reference": reference,
            "amount": amount_ghs,
            "points": points_to_credit
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        print("Payment init failure:", e)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/verify/{reference}")
async def verify_payment(reference: str, db=Depends(get_db)):
    try:
        # Fetch payment record
        pay_res = db.table("payments").select("*").eq("reference", reference).execute()
        if not pay_res.data:
            raise HTTPException(status_code=404, detail="Payment record not found")

        payment = pay_res.data[0]
        if payment["status"] == "success":
            return {
                "status": "success",
                "message": "Payment already verified successfully",
                "points": payment["points"]
            }

        paystack_key = os.environ.get("PAYSTACK_SECRET_KEY")
        if not paystack_key or paystack_key.startswith("sk_live_xxxxxx"):
            paystack_key = "sk_test_7fbc75cb8f83b160216b27e8d2e61df3e86c0c22"

        # Query Paystack verification API
        paystack_url = f"https://api.paystack.co/transaction/verify/{reference}"
        headers = {
            "Authorization": f"Bearer {paystack_key}"
        }

        async with httpx.AsyncClient() as client:
            resp = await client.get(paystack_url, headers=headers)

        if resp.status_code != 200:
            raise HTTPException(status_code=500, detail="Verification request failed")

        res_data = resp.json()
        if not res_data.get("status") or res_data["data"]["status"] != "success":
            return {
                "status": "pending",
                "message": "Payment has not been completed or has failed."
            }

        student_id = payment["student_id"]
        points_to_add = payment["points"]

        # Mark payment as success
        db.table("payments").update({"status": "success"}).eq("reference", reference).execute()

        # Update student's wallet balance
        student_res = db.table("students").select("wallet_points").eq("id", student_id).execute()
        if student_res.data:
            current_points = student_res.data[0].get("wallet_points") or 0
            new_points = current_points + points_to_add
            db.table("students").update({"wallet_points": new_points}).eq("id", student_id).execute()
        
        return {
            "status": "success",
            "message": "Payment verified and points credited!",
            "points": points_to_add
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        print("Payment verification failure:", e)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/wallet/{student_id}")
async def get_wallet_balance(student_id: str, db=Depends(get_db)):
    try:
        student_res = db.table("students").select("wallet_points").eq("id", student_id).execute()
        if not student_res.data:
            raise HTTPException(status_code=404, detail="Student profile not found")
        
        balance = student_res.data[0].get("wallet_points")
        if balance is None:
            balance = 10
            db.table("students").update({"wallet_points": 10}).eq("id", student_id).execute()

        return {
            "student_id": student_id,
            "wallet_points": balance
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
