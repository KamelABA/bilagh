"""
Email utility for Bilagh backend — using Resend HTTP API.
SMTP is blocked by Railway, so we use Resend (free: 100 emails/day).

Setup:
1. Sign up free at https://resend.com
2. Go to API Keys → Create API Key
3. Add to Railway environment variables:
   RESEND_API_KEY = re_xxxxxxxxxxxx
   EMAIL_FROM     = Bilagh <onboarding@resend.dev>   (use resend's default sender until you verify your domain)
"""

import os
import json
import urllib.request
import urllib.error


def send_email(to_email: str, subject: str, html_body: str) -> bool:
    """Send an HTML email via Resend API. Returns True if sent."""
    api_key = os.getenv("RESEND_API_KEY", "")
    from_addr = os.getenv("EMAIL_FROM", "Bilagh <onboarding@resend.dev>")

    if not api_key:
        print(f"[Email] Not configured — set RESEND_API_KEY in Railway variables")
        return False

    payload = json.dumps({
        "from": from_addr,
        "to": [to_email],
        "subject": subject,
        "html": html_body,
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read())
            print(f"[Email] ✅ Sent via Resend to {to_email} — id: {result.get('id')}")
            return True
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"[Email] ❌ Resend API error {e.code}: {body}")
        return False
    except Exception as e:
        print(f"[Email] ❌ Failed: {type(e).__name__}: {e}")
        return False


def send_report_approved_email(to_email: str, user_name: str, report_type: str,
                                report_location: str, notes: str = "") -> bool:
    notes_section = f"""
        <div style="background:#f0f7f0;border-left:4px solid #4A7C2C;padding:12px;border-radius:4px;margin:16px 0;">
            <strong>Municipal Notes / ملاحظات البلدية:</strong><br/>
            {notes}
        </div>
    """ if notes else ""

    html = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
        <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background:linear-gradient(135deg,#0B5394,#4A7C2C);padding:32px;text-align:center;">
                <div style="font-size:48px;margin-bottom:8px;">✅</div>
                <h1 style="color:#fff;margin:0;font-size:24px;">Report Approved!</h1>
                <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:15px;">
                    تم قبول بلاغك
                </p>
            </div>
            <!-- Body -->
            <div style="padding:32px;">
                <p style="font-size:16px;color:#333;">Hello <strong>{user_name}</strong>,</p>
                <p style="color:#555;line-height:1.6;">
                    Great news! The municipal authority has <strong style="color:#4A7C2C;">approved</strong> 
                    your road damage report. Work will be assigned soon.
                </p>
                <p style="color:#555;line-height:1.6;direction:rtl;text-align:right;">
                    تهانينا! قبلت البلدية بلاغك عن تلف الطريق. سيتم تعيين العمال قريبًا.
                </p>

                <!-- Report Details -->
                <div style="background:#f8f9fa;border-radius:12px;padding:20px;margin:24px 0;">
                    <h3 style="margin:0 0 16px;color:#0B5394;font-size:15px;">📋 Report Details</h3>
                    <table style="width:100%;border-collapse:collapse;">
                        <tr>
                            <td style="color:#666;padding:6px 0;font-size:14px;width:40%">Type / النوع</td>
                            <td style="color:#333;font-weight:600;font-size:14px">{report_type}</td>
                        </tr>
                        <tr>
                            <td style="color:#666;padding:6px 0;font-size:14px;">Location / الموقع</td>
                            <td style="color:#333;font-weight:600;font-size:14px">{report_location}</td>
                        </tr>
                        <tr>
                            <td style="color:#666;padding:6px 0;font-size:14px;">Status / الحالة</td>
                            <td style="color:#4A7C2C;font-weight:700;font-size:14px">✅ Approved / مقبول</td>
                        </tr>
                    </table>
                </div>

                {notes_section}

                <p style="color:#666;font-size:13px;text-align:center;margin-top:24px;padding-top:24px;border-top:1px solid #eee;">
                    This email was sent by <strong>Bilagh بلاغ</strong> — Road Damage Reporting System<br/>
                    Do not reply to this email.
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    return send_email(to_email, "✅ Your Report Has Been Approved — بلاغك مقبول", html)


def send_report_rejected_email(to_email: str, user_name: str, report_type: str,
                                report_location: str, notes: str = "") -> bool:
    notes_section = f"""
        <div style="background:#fff5f5;border-left:4px solid #FF4B2B;padding:12px;border-radius:4px;margin:16px 0;">
            <strong>Reason / السبب:</strong><br/>{notes}
        </div>
    """ if notes else ""

    html = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
        <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
            <div style="background:linear-gradient(135deg,#FF4B2B,#FF8C42);padding:32px;text-align:center;">
                <div style="font-size:48px;margin-bottom:8px;">❌</div>
                <h1 style="color:#fff;margin:0;font-size:24px;">Report Update</h1>
                <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:15px;">تحديث البلاغ</p>
            </div>
            <div style="padding:32px;">
                <p style="font-size:16px;color:#333;">Hello <strong>{user_name}</strong>,</p>
                <p style="color:#555;line-height:1.6;">
                    Unfortunately, your road damage report was <strong style="color:#FF4B2B;">not accepted</strong> 
                    at this time. You can submit a new report with more details or a clearer photo.
                </p>
                <p style="color:#555;line-height:1.6;direction:rtl;text-align:right;">
                    للأسف، لم يتم قبول بلاغك في الوقت الحالي. يمكنك تقديم بلاغ جديد بمزيد من التفاصيل أو صورة أوضح.
                </p>
                <div style="background:#f8f9fa;border-radius:12px;padding:20px;margin:24px 0;">
                    <h3 style="margin:0 0 16px;color:#FF4B2B;font-size:15px;">📋 Report Details</h3>
                    <table style="width:100%;border-collapse:collapse;">
                        <tr>
                            <td style="color:#666;padding:6px 0;font-size:14px;width:40%">Type</td>
                            <td style="color:#333;font-weight:600;font-size:14px">{report_type}</td>
                        </tr>
                        <tr>
                            <td style="color:#666;padding:6px 0;font-size:14px;">Location</td>
                            <td style="color:#333;font-weight:600;font-size:14px">{report_location}</td>
                        </tr>
                    </table>
                </div>
                {notes_section}
                <p style="color:#666;font-size:13px;text-align:center;margin-top:24px;padding-top:24px;border-top:1px solid #eee;">
                    Bilagh بلاغ — Road Damage Reporting System
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    return send_email(to_email, "❌ Report Update — تحديث البلاغ", html)
