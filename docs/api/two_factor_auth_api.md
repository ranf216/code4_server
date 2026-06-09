# Two-Factor Auth API

All endpoints are called via **POST** with a JSON body. Every request must include the `#request` field set to `"TwoFactorAuth/<endpoint_name>"`.

**Standard Response Format:**
```json
{
    "rc": 0,
    "message": "success"
}
```

A non-zero `rc` indicates an error. Additional data fields are merged into this base structure when applicable.

**Authentication:** Endpoints in the "Login Verification" section are unauthenticated — they use the `second_factor_key` returned by `User/login` or `User/register` to identify the user. Endpoints in the "Change Factor" section require a `#token` field.

---

## Login Verification

These endpoints complete the two-factor authentication flow initiated by `User/login` or `User/register` when 2FA is enabled. The `second_factor_key` is returned by those endpoints when additional verification is required.

### POST TwoFactorAuth/send_otp_code
Sends an OTP verification code to the user's phone or email on file. This is the first step after receiving a `second_factor_key` from the login/register response.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `second_factor_key` | string | Yes | The key returned by `User/login` or `User/register` when 2FA is required. |
    | `factor_type` | string | Yes | `"PHONE"` or `"EMAIL"`. Determines which channel receives the OTP. |

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
    | 203 | user does not exist | The `second_factor_key` is invalid (no matching user). |
    | 226 | invalid phone verification send new code | The `second_factor_key` has expired. Must re-login to get a new key. |
    | ERR | invalid verification factor type | `factor_type` is not `"PHONE"` or `"EMAIL"`. |

- **Usage & Flows:**
    After `User/login` returns a `second_factor_key`, call this endpoint to send an OTP code to the user's registered phone or email. Then use `verify_otp_code` to submit the received code.

---

### POST TwoFactorAuth/resend_otp_code
Resends the existing OTP code to the user's phone or email without generating a new one.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `second_factor_key` | string | Yes | The key from the login/register response. |
    | `factor_type` | string | Yes | `"PHONE"` or `"EMAIL"`. |

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
    | 203 | user does not exist | The `second_factor_key` is invalid. |
    | 226 | invalid phone verification send new code | The `second_factor_key` has expired, or no pending OTP exists. |
    | ERR | invalid verification factor type | `factor_type` is not `"PHONE"` or `"EMAIL"`. |

- **Usage & Flows:**
    Use when the user did not receive the original OTP. If the key or OTP has expired, the user must re-initiate login and call `send_otp_code` with the new key.

---

### POST TwoFactorAuth/verify_otp_code
Verifies the OTP code and completes the login flow. On success, returns a session token.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `second_factor_key` | string | Yes | The key from the login/register response. |
    | `factor_type` | string | Yes | `"PHONE"` or `"EMAIL"`. |
    | `verification_code` | string | Yes | The OTP code received by the user. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "token": "<session_token>",
        "type": 1,
        "first_name": "John",
        "last_name": "Doe",
        "need_change_password": false
    }
    ```

    When `need_change_password` is `true`, the returned token is a restricted token (X-token) that can only be used with `mandatory_change_password`. The user must change their password before accessing other endpoints.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 203 | user does not exist | The `second_factor_key` is invalid. |
    | 226 | invalid phone verification send new code | The key expired, OTP expired, or max retries exhausted. Must re-login and start over. |
    | 225 | invalid phone verification try again | Wrong code but retries remain (phone). |
    | 236 | invalid email verification try again | Wrong code but retries remain (email). |

- **Usage & Flows:**
    Submit the OTP code the user received. On success, the 2FA state is cleared and a full login is performed. If `need_change_password` is `true`, the client must call `mandatory_change_password` before proceeding to other API calls.

---

## Mandatory Password Change

### POST TwoFactorAuth/mandatory_change_password
*Authenticated (X-Token only).* Forces a password change when the user's password has expired or is flagged for mandatory reset. After success, a new unrestricted token is issued.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | The restricted X-token returned by `verify_otp_code` when `need_change_password` is `true`. |
    | `curr_password` | string | Yes | The user's current password. |
    | `new_password` | string | Yes | The new password. Must meet password criteria (minimum length, uppercase, lowercase, digit, special character). |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "token": "<new_session_token>",
        "type": 1,
        "first_name": "John",
        "last_name": "Doe",
        "need_change_password": false
    }
    ```

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 201 | invalid user token | Token is invalid or not an X-token. |
    | 203 | user does not exist | User not found, inactive, or not an email-login user. |
    | 202 | invalid user or password | Current password is incorrect. |
    | 242 | password must have ... | New password does not meet criteria. |
    | 243 | new password cannot be the same as current | New password is identical to current password. |

- **Usage & Flows:**
    This endpoint is only accessible with the restricted X-token. After changing the password, the old token is invalidated and a new unrestricted session token is returned. The client should replace its stored token with the new one.

---

## Change Factor

These endpoints allow an authenticated user to change their two-factor authentication method (phone number, email, or password). The flow is:
1. Call `change_factor` to initiate the change (validates current password, returns a new `second_factor_key`).
2. Call `change_factor_send_otp_code` to send a verification OTP to the user's **current** phone/email.
3. Call `change_factor_verify_otp_code` to verify and apply the change.

### POST TwoFactorAuth/change_factor
*Authenticated.* Initiates a factor change by validating the user's current password and generating a verification key.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | The current session token. |
    | `factor_type` | string | Yes | The type of factor being changed: `"PHONE"`, `"EMAIL"`, or `"PASSWORD"`. |
    | `curr_password` | string | Yes | The user's current password for verification. |
    | `new_password` | string | No | Required when `factor_type` is `"PASSWORD"`. The new password. |
    | `new_phone_num` | string | No | Required when `factor_type` is `"PHONE"`. The new phone number. |
    | `new_country_code` | string | No | Two-letter country code (e.g. `"us"`). Can be omitted if `new_phone_num` is in international format. |
    | `new_email` | string | No | Required when `factor_type` is `"EMAIL"`. The new email address. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "is_verified": true,
        "second_factor_key": "<verification_key>",
        "phone_num": "****1234",
        "email": "j***@example.com"
    }
    ```

    The `phone_num` and `email` are the user's **current** values (obscured) — these are the channels that will receive the OTP in the next step.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 201 | invalid user token | Token is invalid. |
    | ERR | no action to do | None of `new_password`, `new_phone_num`, or `new_email` were provided. |
    | ERR | invalid factor type | `factor_type` is not `"PHONE"`, `"EMAIL"`, or `"PASSWORD"`. |
    | 203 | user does not exist | User not found, inactive, or not an email-login user. |
    | 202 | invalid user or password | Current password is incorrect. |
    | 224 | invalid phone number | `new_phone_num` could not be parsed into valid international format. |
    | 235 | invalid email address | `new_email` fails validation. |
    | 242 | password must have ... | `new_password` does not meet criteria. |

- **Usage & Flows:**
    Call this first to initiate a factor change. The new value is stored as pending and will only be applied after OTP verification. Use the returned `second_factor_key` with `change_factor_send_otp_code` to proceed.

---

### POST TwoFactorAuth/change_factor_send_otp_code
*Authenticated.* Sends an OTP to the user's current phone or email to verify the factor change.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | The current session token. |
    | `second_factor_key` | string | Yes | The key returned by `change_factor`. |
    | `factor_type` | string | Yes | `"PHONE"` or `"EMAIL"`. The channel to receive the OTP. |

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
    | 201 | invalid user token | Token is invalid. |
    | 203 | user does not exist | The `second_factor_key` is invalid or does not belong to this user. |
    | 226 | invalid phone verification send new code | The `second_factor_key` has expired. Must call `change_factor` again. |
    | ERR | invalid verification factor type | `factor_type` is not `"PHONE"` or `"EMAIL"`. |

- **Usage & Flows:**
    After `change_factor` returns successfully, call this to send an OTP to the user's current registered phone or email. The user must verify ownership of their current factor before the change is applied.

---

### POST TwoFactorAuth/change_factor_resend_otp_code
*Authenticated.* Resends the OTP for the factor change flow.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | The current session token. |
    | `second_factor_key` | string | Yes | The key returned by `change_factor`. |
    | `factor_type` | string | Yes | `"PHONE"` or `"EMAIL"`. |

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
    | 201 | invalid user token | Token is invalid. |
    | 203 | user does not exist | The `second_factor_key` is invalid or does not belong to this user. |
    | 226 | invalid phone verification send new code | Key expired or no pending OTP. Must call `change_factor` again. |
    | ERR | invalid verification factor type | `factor_type` is not `"PHONE"` or `"EMAIL"`. |

- **Usage & Flows:**
    Use when the user did not receive the OTP during the factor change flow. If expired, restart with `change_factor`.

---

### POST TwoFactorAuth/change_factor_verify_otp_code
*Authenticated.* Verifies the OTP and applies the pending factor change (updates phone, email, or password).

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | The current session token. |
    | `second_factor_key` | string | Yes | The key returned by `change_factor`. |
    | `factor_type` | string | Yes | `"PHONE"` or `"EMAIL"`. The channel used for verification. |
    | `verification_code` | string | Yes | The OTP code received by the user. |

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
    | 201 | invalid user token | Token is invalid. |
    | 203 | user does not exist | The `second_factor_key` is invalid or does not belong to this user. |
    | 226 | invalid phone verification send new code | Key expired, OTP expired, or max retries exhausted. Must restart with `change_factor`. |
    | 225 | invalid phone verification try again | Wrong code but retries remain (phone). |
    | 236 | invalid email verification try again | Wrong code but retries remain (email). |

- **Usage & Flows:**
    On success, the pending factor change is applied:
    - **`factor_type` was `"PHONE"`:** The user's phone number is updated.
    - **`factor_type` was `"EMAIL"`:** The user's email is updated.
    - **`factor_type` was `"PASSWORD"`:** The user's password is updated and `USR_PASSWORD_CREATED_ON` is refreshed.

    The 2FA verification state is cleared after successful verification.

---

## Complete Flow Examples

### Login with 2FA
```
1. POST User/login → returns {second_factor_key, phone_num, email}
2. POST TwoFactorAuth/send_otp_code {second_factor_key, factor_type: "PHONE"}
3. POST TwoFactorAuth/verify_otp_code {second_factor_key, factor_type: "PHONE", verification_code: "123456"}
   → returns {token, need_change_password: false}
```

### Login with 2FA + Expired Password
```
1. POST User/login → returns {second_factor_key, ...}
2. POST TwoFactorAuth/send_otp_code {second_factor_key, factor_type: "EMAIL"}
3. POST TwoFactorAuth/verify_otp_code {..., verification_code: "123456"}
   → returns {token: "X...", need_change_password: true}
4. POST TwoFactorAuth/mandatory_change_password {#token: "X...", curr_password, new_password}
   → returns {token: "<new_unrestricted_token>", need_change_password: false}
```

### Change Phone Number
```
1. POST TwoFactorAuth/change_factor {#token, factor_type: "PHONE", curr_password, new_phone_num: "+1555..."}
   → returns {second_factor_key, phone_num: "****1234", email: "j***@..."}
2. POST TwoFactorAuth/change_factor_send_otp_code {#token, second_factor_key, factor_type: "PHONE"}
3. POST TwoFactorAuth/change_factor_verify_otp_code {#token, second_factor_key, factor_type: "PHONE", verification_code: "123456"}
   → phone number updated
```
