# Social Login API

All endpoints are called via **POST** with a JSON body. Every request must include the `#request` field set to `"SocialLogin/<endpoint_name>"`.

**Standard Response Format:**
```json
{
    "rc": 0,
    "message": "success"
}
```

A non-zero `rc` indicates an error. Additional data fields are merged into this base structure when applicable.

**Authentication:** All endpoints in this module are public (no token required). They use `USER_TYPE_NA` access control.

**Flow Overview:**
1. Call one of the `verify_*_auth` endpoints (Facebook, Google, or Apple) to validate the social provider credentials and obtain an `auth_key`.
2. Use the `auth_key` to either `login_with_social` (existing user) or `register_with_social` (new user).

---

## Social Provider Verification

### POST SocialLogin/verify_facebook_auth
Verifies a user's Facebook authentication credentials and returns a temporary `auth_key` for login or registration.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `facebook_user_id` | string | Yes | The user's Facebook user ID. |
    | `facebook_access_token` | string | Yes | The Facebook access token. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "auth_key": "<authorization_key>"
    }
    ```

    If `social_return_is_registered` is enabled in config, the response also includes:
    ```json
    {
        "is_registered": true
    }
    ```

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 212 | Login with Facebook is not allowed. | Facebook login is not enabled in config (`enable_fb_login` is false). |
    | 208 | invalid facebook user id | `facebook_user_id` is empty. |
    | 207 | invalid facebook access token | `facebook_access_token` is empty. |

- **Usage & Flows:**
    Call this as the first step when a user authenticates via Facebook. On success, use the returned `auth_key` with `login_with_social` or `register_with_social`. The `auth_key` expires after `socail_auth_key_valid_for_seconds` (configured on server).

---

### POST SocialLogin/verify_google_auth
Verifies a user's Google authentication credentials and returns a temporary `auth_key` for login or registration.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `google_user_id` | string | Yes | The user's Google user ID. |
    | `google_access_token` | string | Yes | The Google access token. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "auth_key": "<authorization_key>"
    }
    ```

    If `social_return_is_registered` is enabled in config, the response also includes:
    ```json
    {
        "is_registered": true
    }
    ```

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 222 | Login with Google is not allowed. | Google login is not enabled in config (`enable_google_login` is false). |
    | 219 | invalid google user id | `google_user_id` is empty. |
    | 223 | invalid Google access token | `google_access_token` is empty. |

- **Usage & Flows:**
    Call this as the first step when a user authenticates via Google. On success, use the returned `auth_key` with `login_with_social` or `register_with_social`. The `auth_key` expires after `socail_auth_key_valid_for_seconds` (configured on server).

---

### POST SocialLogin/verify_apple_auth
Verifies a user's Apple authentication credentials and returns a temporary `auth_key` for login or registration.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `apple_user_id` | string | Yes | The user's Apple user ID. |
    | `apple_access_token` | string | Yes | The Apple access token. |

- **Return Values:**
    ```json
    {
        "rc": 0,
        "message": "success",
        "auth_key": "<authorization_key>"
    }
    ```

    If `social_return_is_registered` is enabled in config, the response also includes:
    ```json
    {
        "is_registered": true
    }
    ```

- **Error Cases:**
    | rc | Message | Scenario |
    |----|---------|----------|
    | 231 | Login with Apple is not allowed. | Apple login is not enabled in config (`enable_apple_login` is false). |
    | 232 | invalid Apple user id | `apple_user_id` is empty. |
    | 233 | invalid Apple access token | `apple_access_token` is empty. |

- **Usage & Flows:**
    Call this as the first step when a user authenticates via Apple. On success, use the returned `auth_key` with `login_with_social` or `register_with_social`. The `auth_key` expires after `socail_auth_key_valid_for_seconds` (configured on server).

---

## Social Login & Registration

### POST SocialLogin/login_with_social
Logs in an existing user using the `auth_key` obtained from one of the social verification endpoints.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `auth_key` | string | Yes | The authorization key from a `verify_*_auth` endpoint. |
    | `device_id` | string | No | The FCM device ID for push notifications. Can also be set later via `update_device_info`. |
    | `os_type` | integer | No | Operating system type. `1` = Android, `2` = iOS, `3` = Web Browser. Defaults to `0`. |
    | `os_version` | string | No | The operating system version. |
    | `device_model` | string | No | The device model. |
    | `app_version` | string | No | The application version. |
    | `language` | string | No | Two-character language code. Defaults to `"en"`. |

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
    | 229 | invalid social authorization | The `auth_key` is invalid or has expired. |
    | 230 | social user not found | No active user is registered with this social provider identity. Use `register_with_social` instead. |

- **Usage & Flows:**
    Call this after a successful `verify_*_auth` if the user already has an account (or if `is_registered` was `true`). The `auth_key` is consumed and cannot be reused. Use the returned `token` for all subsequent authenticated API calls.

---

### POST SocialLogin/register_with_social
Registers a new user using the `auth_key` obtained from one of the social verification endpoints.

- **API Parameters:**
    | Parameter | Type | Required | Description |
    |-----------|------|----------|-------------|
    | `auth_key` | string | Yes | The authorization key from a `verify_*_auth` endpoint. |
    | `first_name` | string | Yes | The user's first name. Must not be empty. |
    | `last_name` | string | Yes | The user's last name. |
    | `device_id` | string | No | The FCM device ID for push notifications. Can also be set later via `update_device_info`. |
    | `os_type` | integer | No | Operating system type. `1` = Android, `2` = iOS, `3` = Web Browser. Defaults to `0`. |
    | `os_version` | string | No | The operating system version. |
    | `device_model` | string | No | The device model. |
    | `app_version` | string | No | The application version. |
    | `language` | string | No | Two-character language code. Defaults to `"en"`. |

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
    | 229 | invalid social authorization | The `auth_key` is invalid or has expired. |
    | 204 | user already exists | A user with this social provider identity already exists. Use `login_with_social` instead. |

- **Usage & Flows:**
    Call this after a successful `verify_*_auth` if the user does not have an account (or if `is_registered` was `false`). The `auth_key` is consumed and cannot be reused. A new user account is created with the social provider as the login authority (no email/password). Use the returned `token` for all subsequent authenticated API calls.

---

## Configuration

The following config keys affect social login behavior:

| Config Key | Description |
|------------|-------------|
| `enable_fb_login` | Enables/disables Facebook social login. |
| `enable_google_login` | Enables/disables Google social login. |
| `enable_apple_login` | Enables/disables Apple social login. |
| `socail_auth_key_valid_for_seconds` | Duration (in seconds) the `auth_key` remains valid after verification. |
| `social_return_is_registered` | When `true`, the `verify_*_auth` endpoints return an `is_registered` boolean indicating whether the user already exists. |
