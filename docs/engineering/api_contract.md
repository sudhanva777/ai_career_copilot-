# API Contract - AI Career Copilot

## 1. Authentication

### Register
*   **Method**: `POST`
*   **Route**: `/api/v1/auth/register`
*   **Request Schema**:
    ```json
    {
      "email": "user@example.com",
      "password": "securepassword",
      "name": "John Doe"
    }
    ```
*   **Response Schema**:
    ```json
    {
      "id": 1,
      "email": "user@example.com",
      "message": "User registered successfully"
    }
    ```

### Login
*   **Method**: `POST`
*   **Route**: `/api/v1/auth/login`
*   **Request Schema**:
    ```json
    {
      "email": "user@example.com",
      "password": "securepassword"
    }
    ```
*   **Response Schema**:
    ```json
    {
      "access_token": "eyJhbG...",
      "token_type": "bearer"
    }
    ```

## 2. Resume Services

### Upload Resume
*   **Method**: `POST`
*   **Route**: `/api/v1/resume/upload`
*   **Payload**: `multipart/form-data` (file: `resume.pdf`)
*   **Response**: `201 Created`
    ```json
    {
      "resume_id": 101,
      "filename": "my_resume.pdf",
      "status": "processing"
    }
    ```

### List Resumes
*   **Method**: `GET`
*   **Route**: `/api/v1/resume/list`
*   **Response**: `200 OK`
    ```json
    [
      { "id": 101, "filename": "resume1.pdf", "uploaded_at": "2024-01-01T10:00:00" }
    ]
    ```

### Delete Resume
*   **Method**: `DELETE`
*   **Route**: `/api/v1/resume/{id}`
*   **Response**: `204 No Content`

### Get Analysis
*   **Method**: `GET`
*   **Route**: `/api/v1/resume/analysis/{id}`
*   **Response**: `200 OK`
    ```json
    {
      "analysis_id": 501,
      "ats_score": 85.5,
      "extracted_skills": ["Python", "SQL", "React"],
      "predicted_roles": [
        {"role": "Full Stack Developer", "score": 92.0},
        {"role": "Data Engineer", "score": 75.0}
      ],
      "gap_skills": ["Docker", "Kubernetes"]
    }
    ```

## 3. Interview Coach

### Start Interview
*   **Method**: `POST`
*   **Route**: `/api/v1/interview/start`
*   **Request Schema**:
    ```json
    {
      "target_role": "Full Stack Developer",
      "analysis_id": 501
    }
    ```
*   **Response Schema**:
    ```json
    {
      "session_id": 901,
      "questions": [
        {"id": 1, "text": "Explain the difference between SQL and NoSQL databases."},
        {"id": 2, "text": "What is the event loop in JavaScript?"}
      ]
    }
    ```

### Submit Answer
*   **Method**: `POST`
*   **Route**: `/api/v1/interview/answer`
*   **Request Schema**:
    ```json
    {
      "session_id": 901,
      "question_id": 1,
      "answer": "SQL is relational, while NoSQL is non-relational..."
    }
    ```
*   **Response Schema**:
    ```json
    {
      "score": 8,
      "feedback": "Great explanation of relational structure, but could mention scaling differences.",
      "ideal_answer": "Relational databases use structured schemas..."
    }
    ```

## 4. Status Codes
*   `200 OK`: Request succeeded.
*   `201 Created`: Resource successfully created.
*   `400 Bad Request`: Invalid input.
*   `401 Unauthorized`: Token missing or expired.
*   `404 Not Found`: Resource not found.
*   `500 Internal Server Error`: Server-side error.
