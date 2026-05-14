export interface ExamSection {
  title: string;
  marks?: string;
  instructions: string;
  questionRange: [number, number]; // [start, end]
  parts?: {
    title: string;
    questionRange: [number, number];
  }[];
}

export const EXAM_SECTIONS: Record<string, ExamSection[]> = {
  // 2024 Elective Mathematics
  "87a35fd6-82e2-417f-937b-cdbb8c341824": [
    {
      title: "SECTION A",
      marks: "48 marks",
      instructions: "Answer all questions in this section.",
      questionRange: [1, 8]
    },
    {
      title: "SECTION B",
      marks: "52 marks",
      instructions: "Answer four questions only from this section with at least one question from each part. All questions carry equal marks.",
      questionRange: [9, 15],
      parts: [
        {
          title: "PART I: PURE MATHEMATICS",
          questionRange: [9, 11]
        },
        {
          title: "PART II: STATISTICS AND PROBABILITY",
          questionRange: [12, 13]
        },
        {
          title: "PART III: VECTORS AND MECHANICS",
          questionRange: [14, 15]
        }
      ]
    }
  ],
  // 2023 Elective Mathematics
  "e307fc64-499e-4e1d-af55-93fafa24b819": [
    {
      title: "SECTION A",
      marks: "48 marks",
      instructions: "Answer all questions in this section.",
      questionRange: [1, 8]
    },
    {
      title: "SECTION B",
      marks: "52 marks",
      instructions: "Answer four questions only from this section with at least one question from each part. All questions carry equal marks.",
      questionRange: [9, 15],
      parts: [
        {
          title: "PART I: PURE MATHEMATICS",
          questionRange: [9, 11]
        },
        {
          title: "PART II: STATISTICS AND PROBABILITY",
          questionRange: [12, 13]
        },
        {
          title: "PART III: VECTORS AND MECHANICS",
          questionRange: [14, 15]
        }
      ]
    }
  ]
};
