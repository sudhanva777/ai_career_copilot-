# Software Requirement Specification (SRS) - AI Career Copilot

## 1. System Behavior Rules
*   The system shall validate all file uploads to ensure they are either PDF or DOCX and do not exceed 5MB.
*   The system shall issue a JWT upon successful authentication, which must be included in the header of subsequent requests.
*   The system shall persist all resume text and analysis results in the database for user retrieval.
*   **Skill Ontology Matching:** Extracted skills must be matched against a curated skill ontology (CSV/DB) using DistilBERT embeddings and cosine similarity.
*   **Transition States:** Following a successful resume analysis, the system shall maintain the transition state to automatically populate the `target_role` in the Mock Interview component.

## 2. Performance Requirements
*   The backend shall respond to authentication and metadata requests within 500ms.
*   The NLP pipeline shall complete resume parsing and skill extraction within 10 seconds for a standard 2-page resume.
*   The LLM feedback generation shall not exceed 20 seconds per response.

## 3. Security Requirements
*   All user passwords shall be hashed using `bcrypt` before storage.
*   The system shall implement CORS to restrict API access to the approved frontend domain.
*   All sensitive data transmission shall occur over HTTPS.

## 4. Error Handling Standards
*   The system shall return standard HTTP status codes:
    *   `400 Bad Request` for invalid input or file types.
    *   `401 Unauthorized` for missing or invalid tokens.
    *   `404 Not Found` for non-existent resources.
    *   `500 Internal Server Error` for unexpected backend failures.
*   Error responses shall include a JSON body with a descriptive `detail` message.

## 5. API Response Expectations
*   All API responses shall be in JSON format.
*   Successful POST requests shall return the created object or a success message with the relevant ID.
*   GET requests for lists shall support pagination where appropriate.

## 6. File Upload Constraints
*   Max file size: 5,242,880 bytes (5MB).
*   Allowed extensions: `.pdf`, `.docx`.
*   The system shall sanitize filenames to prevent path injection attacks.

## 7. LLM Interaction Rules
*   The system shall use structured prompts to ensure the LLM returns data in a parseable JSON format.
*   The "Interview Coach" shall generate at least 5 questions per session.
*   Feedback generation shall include a numerical score (0-10) and at least 3 actionable tips for improvement.
