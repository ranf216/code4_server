# File API

All endpoints are called via **POST** with a JSON body. Every request must include the `#request` field set to `"File/<endpoint_name>"`.

**Standard Response Format:**
```json
{
    "rc": 0,
    "message": "success"
}
```

A non-zero `rc` indicates an error. Additional data fields are merged into this base structure when applicable.

**Authentication:** All File API endpoints require authentication. A valid `#token` field must be included in the request body.

**Access Levels:** When `file_access_level` is enabled in the system configuration, upload endpoints accept an `access_level` parameter:
- `"public"` — publicly accessible
- `"protected"` — accessible to authenticated users only
- `"limited"` — accessible to authenticated users with a time-limited URL
- `"private"` — accessible only to the file owner with a time-limited URL

If not provided or invalid, the system default access level is used.

---

## Single File Upload

### POST File/upload_file_base64
Uploads a file from a base64-encoded string. Returns a unique file ID on success.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | Session token. |
    | `file_name` | string | Yes | Original file name including extension. |
    | `file_data` | string | Yes | Base64-encoded string of the file contents. |
    | `access_level` | string | No | File access level (`"public"`, `"protected"`, `"limited"`, `"private"`). Only available when `file_access_level` is enabled. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "file_id": "<unique_file_id>"
    }
    ```

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 332 | invalid file name | `file_name` is empty. |
    | 325 | invalid file data | The base64 data could not be decoded. |

- **Usage & Flows:**
    Use this endpoint for small files that can be sent in a single request. For larger files, use the multipart upload flow instead.

---

## Multipart File Upload

The multipart upload flow allows uploading large files in chunks. The flow consists of:
1. **Begin** — Initialize the upload and receive an `upload_id`.
2. **Upload Parts** — Upload each file chunk sequentially using the `upload_id`.
3. **End** — Finalize the upload and assemble the file.

At any point, the upload can be **aborted** to clean up partial data, or the **status** can be queried to check which parts have been uploaded.

---

### POST File/begin_multipart_file_upload
Initializes a multipart file upload session. Returns an `upload_id` to use for subsequent part uploads.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | Session token. |
    | `file_name` | string | Yes | Original file name including extension. Used to determine MIME type. |
    | `upload_to_temp_folder` | boolean | No | If `true`, the assembled file is stored in the temp folder instead of the standard file container. Defaults to `false`. |
    | `access_level` | string | No | File access level (`"public"`, `"protected"`, `"limited"`, `"private"`). Only available when `file_access_level` is enabled. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "upload_id": "<unique_upload_id>"
    }
    ```

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 332 | invalid file name | `file_name` is empty. |

- **Usage & Flows:**
    Call this endpoint first to start a multipart upload. Use the returned `upload_id` in all subsequent `upload_file_part`, `get_multipart_upload_status`, `end_multipart_file_upload`, and `abort_multipart_upload` calls.

---

### POST File/upload_file_part
Uploads a single part (chunk) of a multipart file upload.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | Session token. |
    | `upload_id` | string | Yes | The upload ID returned by `begin_multipart_file_upload`. |
    | `part_number` | integer | Yes | Index of the part being uploaded, starting with `1`. Must be a positive integer. |
    | `part_data` | string | Yes | Base64-encoded string of the file part. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success"
    }
    ```

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 327 | invalid multipart upload part number | `part_number` is not a positive integer. |
    | 326 | invalid multipart upload id | `upload_id` not found or does not belong to the authenticated user. |
    | 331 | multipart upload part num already exist | A part with the same `part_number` has already been uploaded. |
    | 325 | invalid file data | The base64 data could not be decoded. |

- **Usage & Flows:**
    Upload parts in any order. Each part must have a unique `part_number`. If a database error occurs during the part tracking update, the entire multipart upload is automatically aborted and all uploaded parts are cleaned up.

---

### POST File/get_multipart_upload_status
Returns the list of part numbers that have been successfully uploaded for a multipart upload session.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | Session token. |
    | `upload_id` | string | Yes | The upload ID returned by `begin_multipart_file_upload`. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "uploaded_parts": [1, 2, 3]
    }
    ```
    The `uploaded_parts` array contains the sorted part numbers that have been uploaded so far.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 326 | invalid multipart upload id | `upload_id` not found or does not belong to the authenticated user. |

- **Usage & Flows:**
    Use this endpoint to check upload progress, especially useful for resuming interrupted uploads.

---

### POST File/end_multipart_file_upload
Finalizes a multipart upload by assembling all uploaded parts into a single file. Returns the file ID on success.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | Session token. |
    | `upload_id` | string | Yes | The upload ID returned by `begin_multipart_file_upload`. |
    | `num_of_parts` | integer | Yes | The total number of parts that were uploaded. Must match the actual number of uploaded parts. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "file_id": "<unique_file_id>"
    }
    ```

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 326 | invalid multipart upload id | `upload_id` not found or does not belong to the authenticated user. |
    | 328 | missing multipart parts | No parts uploaded, or `num_of_parts` does not match the actual uploaded count. |
    | 329 | inconsistent multipart parts | Part numbers are not a contiguous sequence from 1 to `num_of_parts`. |
    | 330 | failed to write file | A file system error occurred while assembling the parts. |

- **Usage & Flows:**
    Call this endpoint after all parts have been uploaded. The system verifies that parts form a contiguous sequence from 1 to `num_of_parts`, assembles them in order, stores the final file, and creates a record in the `file` table. All temporary part files are cleaned up regardless of success or failure.

---

### POST File/abort_multipart_upload
Aborts an in-progress multipart upload, deleting all uploaded parts and the upload session record.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | Session token. |
    | `upload_id` | string | Yes | The upload ID returned by `begin_multipart_file_upload`. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success"
    }
    ```

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 326 | invalid multipart upload id | `upload_id` not found or does not belong to the authenticated user. |

- **Usage & Flows:**
    Use this endpoint to cancel an upload that is no longer needed. All temporary part files and the multipart session record are permanently deleted.
