# User API

All endpoints are called via **POST** with a JSON body. Every request must include the `#request` field set to `"User/<endpoint_name>"`.

**Standard Response Format:**
```json
{
    "rc": 0,
    "message": "success"
}
```

A non-zero `rc` indicates an error. Additional data fields are merged into this base structure when applicable.

**Authentication:** Endpoints marked as *Authenticated* require a `#token` field in the request body. Admin-only endpoints require an Admin-type token.

---

## Authentication - Email/Password

> **Note:** All login endpoints may return `need_change_password: true` when the user's password has expired (based on the `password_valid_for_seconds` config) or was reset by an admin. In this case, the token is an X-token and the client must call `User/mandatory_change_password` before accessing other authenticated APIs.

### POST User/login
Authenticates a user with email and password. Returns a session token on success. If two-factor authentication is enabled, returns a second-factor key instead, requiring additional verification before a token is issued.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `email` | string | Yes | The user's email address. |
    | `password` | string | Yes | The user's password. |
    | `device_id` | string | No | The FCM device ID for push notifications. Can also be set later via `update_device_info`. |
    | `os_type` | integer | No | Operating system type. `1` = Android, `2` = iOS, `3` = Web Browser. Defaults to `0`. |
    | `os_version` | string | No | The operating system version. |
    | `device_model` | string | No | The device model. |
    | `app_version` | string | No | The application version. |
    | `language` | string | No | Two-character language code. Defaults to the system default language. |

- **Return Values:**

    *Without two-factor auth:*
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

    *With two-factor auth enabled:*
    ```json
    {
        "rc": 0,
        "message": "success",
        "second_factor_key": "<key>",
        "phone_num": "****1234",
        "email": "j***@example.com"
    }
    ```

    When `need_change_password` is `true`, the returned `token` is an X-token (starts with `"X"`). The client must call `mandatory_change_password` before using any other authenticated API.

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 202 | invalid user or password | Email not found or incorrect password. |
    | 218 | account is temporarily locked | Too many failed login attempts within the cooldown window. |

- **Usage & Flows:**
    This is the primary email/password login endpoint. On success without 2FA, use the returned `token` for all subsequent authenticated API calls. If `need_change_password` is `true`, redirect the user to change their password first using the `mandatory_change_password` endpoint. When 2FA is enabled, use the `second_factor_key` with the two-factor auth verification flow before a session token is granted.

---

### POST User/register
Registers a new user with email and password. Returns a session token on success, or a second-factor key if 2FA is enabled.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `first_name` | string | Yes | The user's first name. Must not be empty. |
    | `last_name` | string | Yes | The user's last name. Must not be empty. |
    | `email` | string | Yes | A valid email address. Must be unique across active users. |
    | `password` | string | Yes | Must meet the system's password criteria (minimum length, uppercase, lowercase, digit, special character). |
    | `device_id` | string | No | The FCM device ID for push notifications. |
    | `os_type` | integer | No | `1` = Android, `2` = iOS, `3` = Web Browser. Defaults to `0`. |
    | `os_version` | string | No | The operating system version. |
    | `device_model` | string | No | The device model. |
    | `app_version` | string | No | The application version. |
    | `language` | string | No | Two-character language code. Defaults to the system default language. |

- **Return Values:**

    *Without two-factor auth:*
    ```json
    {
        "rc": 0,
        "message": "success",
        "token": "<session_token>"
    }
    ```

    *With two-factor auth enabled:*
    ```json
    {
        "rc": 0,
        "message": "success",
        "second_factor_key": "<key>",
        "email": "j***@example.com"
    }
    ```

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 213 | first name is a required parameter | `first_name` is empty. |
    | 214 | last name is a required parameter | `last_name` is empty. |
    | 235 | invalid email address | `email` fails validation. |
    | 242 | password must have ... | `password` does not meet criteria. |
    | 204 | user already exists | An active user with this email already exists. |

- **Usage & Flows:**
    Use this endpoint for new user self-registration via email/password. The user is immediately active upon registration. Without 2FA, the returned `token` can be used right away. With 2FA enabled, complete the second-factor verification flow before a token is issued.

---

### POST User/mandatory_change_password
*Authenticated (X-token only).* Changes the user's password when `need_change_password` is `true`. This endpoint only accepts X-tokens (`@accept_x_token: "only"`), meaning it can only be called when the server has flagged the password as needing change.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | The current X-token (starts with `"X"`). |
    | `curr_password` | string | Yes | The user's current password. |
    | `new_password` | string | Yes | The new password. Must meet password criteria and differ from the current password. |

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
    | 201 | invalid user token | The token is invalid. |
    | 202 | invalid user or password | The current password is incorrect. |
    | 203 | user does not exist | The user account is not found or inactive. |
    | 242 | password must have ... | The new password does not meet criteria. |
    | 243 | new password cannot be same as current | The new password is the same as the current one. |

- **Usage & Flows:**
    Call this when a login response returns `need_change_password: true`. The user must provide their current password and choose a new one. On success, the old X-token is invalidated and a new regular token is returned. Use the new token for all subsequent API calls.

---

### POST User/forgot_password
Initiates a password reset by sending a reset link to the user's email address. Always returns success even if the email is not found, to prevent user enumeration.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `email` | string | Yes | The email address of the account. |
    | `language` | string | Yes | Two-character language code for the email template. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success"
    }
    ```

    In non-production environments, the response also includes a `link` field for testing.

- **Error Cases:**
    None. The endpoint always returns success to the consumer.

- **Usage & Flows:**
    Call this when a user requests a password reset. A reset link containing a `user_id` and `activation_code` is sent to the provided email. The user follows the link and completes the flow by calling `reset_password`.

---

### POST User/reset_password
Completes the password reset flow using the activation code received via email.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `user_id` | string | Yes | The user ID from the reset link. |
    | `activation_code` | string | Yes | The activation code from the reset link. |
    | `password` | string | Yes | The new password. Must meet password criteria. |
    | `language` | string | Yes | Two-character language code. |

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
    | 242 | password must have ... | New password does not meet criteria. |
    | 206 | invalid activation code | The `user_id` / `activation_code` combination is invalid or already used. |

- **Usage & Flows:**
    This endpoint is called after the user clicks the password reset link from `forgot_password`. Pass the `user_id` and `activation_code` from the link along with the new password. On success, the user can log in with the new password.

---

## Authentication - Phone OTP

### POST User/send_sms_code
Sends an OTP verification code via SMS to the specified phone number.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `phone_num` | string | Yes | The phone number. Can be in international format or local format. |
    | `country_code` | string | No | Two-letter country code (e.g. `"us"`). Can be omitted if `phone_num` is in international format. Defaults to `"us"`. |

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
    | 224 | invalid phone number | The phone number could not be parsed into a valid international format. |
    | 361 | failed to send sms | The SMS provider failed to deliver the code. |

- **Usage & Flows:**
    This is the first step in the phone-based OTP authentication flow. After calling this, the user receives an SMS code which must be submitted via `verify_sms_code`. The code is valid for a configured duration.

---

### POST User/resend_sms_code
Resends the existing OTP code to the same phone number without generating a new one.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `phone_num` | string | Yes | The phone number used in the original `send_sms_code` call. |
    | `country_code` | string | No | Two-letter country code. Defaults to `"us"`. |

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
    | 224 | invalid phone number | Invalid phone number format. |
    | 226 | invalid phone verification send new code | No pending OTP exists for this number or it has expired. A new code must be requested via `send_sms_code`. |
    | 361 | failed to send sms | The SMS provider failed. |

- **Usage & Flows:**
    Use when the user did not receive the original SMS code. If the pending OTP has expired, this will fail and you must call `send_sms_code` again.

---

### POST User/verify_sms_code
Verifies the OTP code that was sent via SMS. On success, returns an `auth_key` that is used for `login_with_phone` or `register_with_phone`.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `phone_num` | string | Yes | The phone number. |
    | `country_code` | string | No | Two-letter country code. Defaults to `"us"`. |
    | `verification_code` | string | Yes | The OTP code received via SMS. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "auth_key": "<authorization_key>"
    }
    ```

    If configured, the response may also include:
    ```json
    {
        "is_registered": true
    }
    ```

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 224 | invalid phone number | Invalid phone number format. |
    | 225 | invalid phone verification try again | Wrong code but retries remain. |
    | 226 | invalid phone verification send new code | Wrong code and max retries exhausted, or OTP expired. Must call `send_sms_code` again. |

- **Usage & Flows:**
    After the user receives the SMS code, submit it here. On success, use the returned `auth_key` to call either `login_with_phone` (existing user) or `register_with_phone` (new user). The optional `is_registered` field indicates whether the phone number is already associated with an account.

---

### POST User/login_with_phone
Logs in an existing user using the `auth_key` obtained from `verify_sms_code`.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `auth_key` | string | Yes | The authorization key from `verify_sms_code`. |
    | `device_id` | string | No | FCM device ID. |
    | `os_type` | integer | No | `1` = Android, `2` = iOS, `3` = Web Browser. Defaults to `0`. |
    | `os_version` | string | No | Operating system version. |
    | `device_model` | string | No | Device model. |
    | `app_version` | string | No | Application version. |
    | `language` | string | No | Two-character language code. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "token": "<session_token>",
        "type": 1,
        "first_name": "John",
        "last_name": "Doe"
    }
    ```

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 227 | invalid phone authorization | The `auth_key` is invalid or expired. |
    | 228 | user phone not found | No active user is associated with this phone number. |

- **Usage & Flows:**
    Call this after a successful `verify_sms_code` if the user already has an account. Use the returned `token` for all subsequent authenticated calls.

---

### POST User/register_with_phone
Registers a new user using the `auth_key` obtained from `verify_sms_code`.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `auth_key` | string | Yes | The authorization key from `verify_sms_code`. |
    | `first_name` | string | Yes | First name. Must not be empty. |
    | `last_name` | string | Yes | Last name. Must not be empty. |
    | `email` | string | Yes | A valid email address. |
    | `device_id` | string | No | FCM device ID. |
    | `os_type` | integer | No | `1` = Android, `2` = iOS, `3` = Web Browser. Defaults to `0`. |
    | `os_version` | string | No | Operating system version. |
    | `device_model` | string | No | Device model. |
    | `app_version` | string | No | Application version. |
    | `language` | string | No | Two-character language code. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "token": "<session_token>"
    }
    ```

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 213 | first name is a required parameter | `first_name` is empty. |
    | 214 | last name is a required parameter | `last_name` is empty. |
    | 215 | email is a required parameter | `email` is empty. |
    | 235 | invalid email address | `email` fails validation. |
    | 227 | invalid phone authorization | The `auth_key` is invalid or expired. |
    | 240 | user with this email already exists | The email is already taken. |
    | 204 | user already exists | A user with this phone or email already exists. |

- **Usage & Flows:**
    Call this after a successful `verify_sms_code` if the user does not have an account. The phone number is taken from the verified OTP session. Use the returned `token` for subsequent authenticated calls.

---

## Authentication - Email OTP

### POST User/send_email_code
Sends an OTP verification code to the specified email address.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `email` | string | Yes | The email address to send the verification code to. |

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
    | 235 | invalid email address | The email address is invalid. |
    | 364 | failed to send email | The email provider failed to deliver. |

- **Usage & Flows:**
    This is the first step in the email-based OTP authentication flow. After calling this, the user receives a code via email which must be submitted via `verify_email_code`.

---

### POST User/resend_email_code
Resends the existing OTP code to the same email address without generating a new one.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `email` | string | Yes | The email address used in the original `send_email_code` call. |

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
    | 235 | invalid email address | Invalid email format. |
    | 237 | invalid email verification send new code | No pending OTP exists or it has expired. Call `send_email_code` again. |
    | 364 | failed to send email | The email provider failed. |

- **Usage & Flows:**
    Use when the user did not receive the original email code. If the OTP has expired, call `send_email_code` again.

---

### POST User/verify_email_code
Verifies the OTP code sent via email. Returns an `auth_key` for use with `login_with_email` or `register_with_email`.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `email` | string | Yes | The email address. |
    | `verification_code` | string | Yes | The OTP code received via email. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "auth_key": "<authorization_key>"
    }
    ```

    If configured, the response may also include:
    ```json
    {
        "is_registered": true
    }
    ```

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 235 | invalid email address | Invalid email format. |
    | 236 | invalid email verification try again | Wrong code but retries remain. |
    | 237 | invalid email verification send new code | Wrong code and max retries exhausted, or OTP expired. Must call `send_email_code` again. |

- **Usage & Flows:**
    Submit the email verification code here. On success, use the `auth_key` to call `login_with_email` or `register_with_email`. The optional `is_registered` field tells you whether the email already has an account.

---

### POST User/login_with_email
Logs in an existing user using the `auth_key` obtained from `verify_email_code`.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `auth_key` | string | Yes | The authorization key from `verify_email_code`. |
    | `device_id` | string | No | FCM device ID. |
    | `os_type` | integer | No | `1` = Android, `2` = iOS, `3` = Web Browser. Defaults to `0`. |
    | `os_version` | string | No | Operating system version. |
    | `device_model` | string | No | Device model. |
    | `app_version` | string | No | Application version. |
    | `language` | string | No | Two-character language code. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "token": "<session_token>",
        "type": 1,
        "first_name": "John",
        "last_name": "Doe"
    }
    ```

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 238 | invalid email authorization | The `auth_key` is invalid or expired. |
    | 239 | user email not found | No active user is associated with this email. |

- **Usage & Flows:**
    Call after a successful `verify_email_code` if the user has an existing account. Use the returned `token` for all subsequent authenticated calls.

---

### POST User/register_with_email
Registers a new user using the `auth_key` obtained from `verify_email_code`.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `auth_key` | string | Yes | The authorization key from `verify_email_code`. |
    | `first_name` | string | Yes | First name. Must not be empty. |
    | `last_name` | string | Yes | Last name. Must not be empty. |
    | `phone_num` | string | Yes | Phone number. Can be local or international format. |
    | `country_code` | string | No | Two-letter country code. Can be omitted if `phone_num` is international. |
    | `device_id` | string | No | FCM device ID. |
    | `os_type` | integer | No | `1` = Android, `2` = iOS, `3` = Web Browser. Defaults to `0`. |
    | `os_version` | string | No | Operating system version. |
    | `device_model` | string | No | Device model. |
    | `app_version` | string | No | Application version. |
    | `language` | string | No | Two-character language code. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "token": "<session_token>"
    }
    ```

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 213 | first name is a required parameter | `first_name` is empty. |
    | 214 | last name is a required parameter | `last_name` is empty. |
    | 224 | invalid phone number | `phone_num` could not be parsed. |
    | 238 | invalid email authorization | The `auth_key` is invalid or expired. |
    | 241 | user with this phone already exists | The phone number is already taken. |
    | 204 | user already exists | A user with this email or phone already exists. |

- **Usage & Flows:**
    Call after a successful `verify_email_code` if the user does not have an account. The email is taken from the verified OTP session. Use the returned `token` for subsequent authenticated calls.

---

## Authentication - Auth Grant

### POST User/get_login_auth_grant
*Authenticated.* Generates an encrypted auth grant that can be used to log in on another device or session without re-entering credentials.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | The current session token. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "grant_id": "<grant_identifier>",
        "auth_grant": "<encrypted_grant_payload>"
    }
    ```

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 201 | invalid user token | The token is invalid or expired. |
    | 249 | authentication grant is not enabled | The auth grant feature is not enabled on the server. |

- **Usage & Flows:**
    Call this from an already-authenticated session to obtain a transferable auth grant. Pass the returned `grant_id` and `auth_grant` to `login_with_auth_grant` to establish a new session. The grant expires after a configured duration.

---

### POST User/login_with_auth_grant
Authenticates a user using an encrypted auth grant obtained from `get_login_auth_grant`.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `grant_id` | string | Yes | The grant identifier. |
    | `auth_grant` | string | Yes | The encrypted grant payload. |
    | `device_id` | string | No | FCM device ID. |
    | `os_type` | integer | No | `1` = Android, `2` = iOS, `3` = Web Browser. Defaults to `0`. |
    | `os_version` | string | No | Operating system version. |
    | `device_model` | string | No | Device model. |
    | `app_version` | string | No | Application version. |
    | `language` | string | No | Two-character language code. |

- **Return Values:**

    *Without two-factor auth:*
    ```json
    {
        "rc": 0,
        "message": "success",
        "token": "<session_token>",
        "type": 1,
        "first_name": "John",
        "last_name": "Doe"
    }
    ```

    *With two-factor auth enabled:*
    ```json
    {
        "rc": 0,
        "message": "success",
        "second_factor_key": "<key>",
        "phone_num": "****1234",
        "email": "j***@example.com"
    }
    ```

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 249 | authentication grant is not enabled | The auth grant feature is disabled. |
    | 250 | invalid authentication grant | The grant payload is invalid or tampered with. |
    | 251 | the authentication grant has expired | The grant has expired. |
    | 202 | invalid user or password | The user associated with the grant is no longer active. |

- **Usage & Flows:**
    Use the `grant_id` and `auth_grant` from `get_login_auth_grant` to open a session on a different device or client. Behaves like `login` after validation — returns a token directly, or a second-factor key if 2FA is enabled.

---

## Session Management

### POST User/logout
*Authenticated.* Logs out the current user by invalidating their session token.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | The current session token. Also accepted via the `X-Token` header. |

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
    | 201 | invalid user token | The token is invalid or already expired. |

- **Usage & Flows:**
    Call this when the user signs out. After a successful logout, the token is no longer valid and cannot be used for any authenticated requests.

---

### POST User/update_device_info
*Authenticated.* Updates the device and application information for the currently logged-in user.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | The current session token. |
    | `device_id` | string | No | FCM device ID for push notifications. |
    | `os_type` | integer | No | `1` = Android, `2` = iOS, `3` = Web Browser. Defaults to `0`. |
    | `os_version` | string | No | Operating system version. |
    | `device_model` | string | No | Device model. |
    | `app_version` | string | No | Application version. |

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
    | 201 | invalid user token | The token is invalid. |

- **Usage & Flows:**
    Call this after login if device information was not provided during the login/register call, or whenever the device info changes (e.g. app update, OS update). Only the provided fields are updated; omitted fields remain unchanged.

---

### POST User/update_user_language
*Authenticated.* Updates the preferred language for the currently logged-in user.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | The current session token. |
    | `language` | string | Yes | Two-character language code. |

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
    | 201 | invalid user token | The token is invalid. |

- **Usage & Flows:**
    Call when the user changes their in-app language preference. This affects the language of server-generated content such as emails and error messages.

---

## User Management (Admin)

### POST User/add_user
*Admin only.* Creates a new user account with a specified type.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `first_name` | string | Yes | First name. |
    | `last_name` | string | Yes | Last name. |
    | `email` | string | Yes | Email address. Must be unique among active users. |
    | `password` | string | Yes | The initial password. |
    | `type` | integer | Yes | User type. `1` = Admin, `2` = Regular. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "userid": "<new_user_id>"
    }
    ```

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid token. |
    | 205 | invalid user type | `type` is not `1` or `2`. |
    | 204 | user already exists | An active user with this email exists. |

- **Usage & Flows:**
    Use this from an admin panel to create user accounts. The created user can immediately log in with the provided email and password.

---

### POST User/update_user
*Admin only.* Updates an existing user's profile, type, and status.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `user_id` | string | Yes | The ID of the user to update. |
    | `first_name` | string | Yes | Updated first name. |
    | `last_name` | string | Yes | Updated last name. |
    | `email` | string | Yes | Updated email. |
    | `type` | integer | Yes | User type. `1` = Admin, `2` = Regular. |
    | `status` | integer | Yes | User status. |

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
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid token. |
    | 205 | invalid user type | `type` is not `1` or `2`. |
    | 203 | user does not exist | No active user found with the given `user_id`. |

- **Usage & Flows:**
    Use from an admin panel to modify a user's details. All fields are required and fully replace the existing values.

---

### POST User/reset_user_password
*Admin only.* Resets a user's password by generating a random temporary password and sending it to the user's email.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `user_id` | string | Yes | The ID of the user whose password should be reset. |

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
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid token. |
    | 203 | user does not exist | No active user found with the given `user_id`. |

- **Usage & Flows:**
    Use from an admin panel to reset a user's password. A temporary password starting with `"X"` is generated and emailed to the user via the `reset_password` email template. On the user's next login, the response will include `need_change_password: true` and an X-token, requiring them to set a new password via `mandatory_change_password`.

---

### POST User/delete_user
*Admin only.* Soft-deletes a user account. The user is marked as deleted and can no longer log in.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |
    | `user_id` | string | Yes | The ID of the user to delete. |

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
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid token. |
    | 203 | user does not exist | No active user found with the given `user_id`. |

- **Usage & Flows:**
    Removes the user's active session and marks the account as deleted. The user's email and phone are appended with `/DELETED` to free them for reuse. This is a soft delete; the record is retained.

---

### POST User/get_users
*Admin only.* Returns a list of all active (non-deleted) users.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "users":
        [
            {
                "user_id": "<id>",
                "email": "user@example.com",
                "first_name": "John",
                "last_name": "Doe",
                "create": "2024-01-01 00:00:00",
                "last_login": "2024-06-01 12:00:00",
                "last_access": "2024-06-01 12:30:00",
                "type": 2,
                "status": 1
            }
        ]
    }
    ```

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 103 | current user does not have privileges | The caller is not an Admin. |
    | 201 | invalid user token | Invalid token. |

- **Usage & Flows:**
    Use from an admin panel to display a user directory. Results are sorted by creation date.

---

## Self-Service

### POST User/delete_profile
*Authenticated (Regular users only).* Allows a regular user to delete their own account.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | The current session token. |

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
    | 201 | invalid user token | Invalid token. |
    | 103 | current user does not have privileges | The caller is not a Regular-type user. |
    | 203 | user does not exist | The user's account is not found. |

- **Usage & Flows:**
    Provides GDPR-style self-service account deletion. The session is invalidated, and the account is soft-deleted with email and phone marked as deleted. This action is irreversible from the consumer's perspective.

---

## System User Authentication

### POST User/system_login
Authenticates a system-level user (non-regular user) with a username and password. System users are service accounts used for machine-to-machine or back-office integrations.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `user_name` | string | Yes | The system user's username. |
    | `password` | string | Yes | The system user's password. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "token": "<system_session_token>"
    }
    ```

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 202 | invalid user or password | Username not found or incorrect password. |
    | 218 | account is temporarily locked | Too many failed login attempts. |

- **Usage & Flows:**
    Use this for server-to-server or back-office tool authentication. The returned token persists across logins until explicitly logged out. Failed login attempts trigger the same lockout policy as regular user login.

---

### POST User/system_logout
Logs out a system user by invalidating their token.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `token` | string | Yes | The system user's session token. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success"
    }
    ```

- **Error Cases:**
    None specific. Always returns success.

- **Usage & Flows:**
    Call this when the system integration session should end. The token is invalidated and a new `system_login` is required.

---

## Setup (Superuser)

> **Note:** The following endpoints are restricted to superuser mode and are only available when explicitly enabled in the server configuration. They are intended for initial system setup and administrative tooling.

### POST User/__create_admin
*Superuser mode.* Creates a new Admin-type user account.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `email` | string | Yes | The admin's email address. |
    | `password` | string | Yes | The admin's password. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "userid": "<new_admin_user_id>"
    }
    ```

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 204 | user already exists | A user with this email already exists. |

- **Usage & Flows:**
    Used during initial system setup to create the first admin account. This is typically the first API call made after a fresh deployment.

---

### POST User/__create_null_user
*Superuser mode, Admin token required.* Creates a special system placeholder user.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `#token` | string | Yes | An Admin session token. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "userid": "<null_user_id>"
    }
    ```

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 204 | user already exists | The null user has already been created. |
    | 103 | current user does not have privileges | The caller is not an Admin. |

- **Usage & Flows:**
    Creates a designated placeholder user record used internally by the system. Should only be called once during initial setup.

---

### POST User/__set_system_user
*Superuser mode.* Creates or updates a system user account.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `user_name` | string | Yes | The system user's username. |
    | `password` | string | Yes | The system user's password. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success"
    }
    ```

- **Error Cases:**
    None specific. Creates if not exists, updates if exists.

- **Usage & Flows:**
    Use during initial setup or when rotating system user credentials. If the username already exists, its password is updated and its active token is invalidated.

---
