import os
from database import get_db

MCQ_KEY = {
    1: "C", 2: "D", 3: "D", 4: "B", 5: "C",
    6: "C", 7: "D", 8: "B", 9: "A", 10: "A",
    11: "A", 12: "B", 13: "B", 14: "C", 15: "B",
    16: "A", 17: "C", 18: "B", 19: "C", 20: "A",
    21: "B", 22: "A", 23: "D", 24: "D", 25: "B",
    26: "B", 27: "B", 28: "A", 29: "A", 30: "B",
    31: "C", 32: "D", 33: "D", 34: "B", 35: "B",
    36: "D", 37: "B", 38: "B", 39: "D", 40: "A",
    41: "B", 42: "C", 43: "A", 44: "C", 45: "A",
    46: "B", 47: "A", 48: "C", 49: "B", 50: "A"
}

# Optional: Add the result text for better UI review
MCQ_TEXT = {
    1: "$16,765.79", 2: "Locus of points equidistant from M and N", 3: "14 km", 4: "V = 1/2 rS", 5: "1.65",
    18: "36.74 cm^2", 28: "4,158 cm^2", 40: "25.7 cm^2", 43: "(p - 3r)(5p + 4q)", 50: "w = mn / (h-1)(n-m)"
}

def update_mcqs():
    db = get_db()
    exam_id = "fd9c561c-f0f1-411d-aee7-75f2656f4904" # 2025 Maths Core
    
    print(f"Updating 50 MCQs for exam: {exam_id}")
    
    for q_num, letter in MCQ_KEY.items():
        text = MCQ_TEXT.get(q_num, "")
        # Format for the smart grading engine
        rubric = f"Equation: {letter} = {text}"
        
        try:
            res = db.table("questions") \
                .update({"marking_scheme": rubric}) \
                .eq("exam_id", exam_id) \
                .eq("question_number", str(q_num)) \
                .eq("is_mcq", True) \
                .execute()
            
            if res.data:
                print(f" [+] Updated Q{q_num}: {letter}")
            else:
                print(f" [!] Q{q_num} not found!")
        except Exception as e:
            print(f" [X] Error Q{q_num}: {e}")

if __name__ == "__main__":
    update_mcqs()
