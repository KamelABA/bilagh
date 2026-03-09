"""
Email utility for Bilagh backend.
Supports Gmail SMTP via app password.

Setup in Railway environment variables:
  EMAIL_USER     = your-email@gmail.com
  EMAIL_PASSWORD = your-gmail-app-password  (not your normal password!)

To get a Gmail app password:
  1. Enable 2FA on your Google account
  2. Go to myaccount.google.com -> Security -> App Passwords
  3. Generate a password for "Mail"
"""

import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText


def send_email(to_email: str, subject: str, html_body: str) -> bool:
    """Send an HTML email. Returns True if sent, False if skipped/failed."""
    email_user = os.getenv("EMAIL_USER", "")
    email_password = os.getenv("EMAIL_PASSWORD", "")

    if not email_user or not email_password:
        print(f"[Email] Not configured — skipping email to {to_email}")
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"Bilagh بلاغ <{email_user}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=10) as server:
            server.login(email_user, email_password)
            server.sendmail(email_user, to_email, msg.as_string())
        print(f"[Email] ✅ Sent to {to_email} — {subject}")
        return True
    except smtplib.SMTPAuthenticationError as e:
        print(f"[Email] ❌ AUTH FAILED for {email_user}: {e}")
        print("[Email] → Make sure you are using a Gmail APP PASSWORD (not your regular password)")
        print("[Email] → Visit: myaccount.google.com → Security → App Passwords")
        return False
    except Exception as e:
        print(f"[Email] ❌ Failed to send to {to_email}: {type(e).__name__}: {e}")
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
