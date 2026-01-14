"""
External Notifications API
Discord and Email notification integrations
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Optional, List
import aiohttp
import json
import os
from datetime import datetime, timezone
from pydantic import BaseModel, EmailStr

from core.database import get_db
from core.security import get_current_admin_user, get_current_user
from services.audit import AuditService

router = APIRouter(prefix="/notifications")


class DiscordWebhookConfig(BaseModel):
    webhook_url: str
    enabled: bool = True
    notify_server_start: bool = True
    notify_server_stop: bool = True
    notify_new_session: bool = True
    notify_user_join: bool = False


class EmailConfig(BaseModel):
    smtp_host: str
    smtp_port: int = 587
    smtp_user: str
    smtp_password: str
    from_email: str
    enabled: bool = True
    notify_server_start: bool = True
    notify_server_stop: bool = True
    notify_new_session: bool = True


class TestNotification(BaseModel):
    channel: str  # 'discord' or 'email'
    recipient: Optional[str] = None  # email address for email


class NotificationPayload(BaseModel):
    event_type: str  # server_start, server_stop, new_session, etc.
    title: str
    message: str
    server_name: Optional[str] = None
    session_title: Optional[str] = None
    extra_data: Optional[dict] = None


CONFIG_KEY_DISCORD = 'notification_discord'
CONFIG_KEY_EMAIL = 'notification_email'


def get_notification_config(config_key: str) -> Optional[dict]:
    """Get notification configuration from database"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM system_config WHERE key = ?", (config_key,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return json.loads(row['value'])
    return None


def save_notification_config(config_key: str, config: dict):
    """Save notification configuration to database"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT OR REPLACE INTO system_config (key, value)
        VALUES (?, ?)
    ''', (config_key, json.dumps(config)))
    conn.commit()
    conn.close()


# ============ Discord Integration ============

@router.get("/discord/config")
async def get_discord_config(current_user: dict = Depends(get_current_admin_user)):
    """Get Discord webhook configuration"""
    config = get_notification_config(CONFIG_KEY_DISCORD)
    if config:
        # Hide full webhook URL for security
        if 'webhook_url' in config:
            config['webhook_url_masked'] = config['webhook_url'][:50] + '...' if len(config['webhook_url']) > 50 else config['webhook_url']
    return config or {"enabled": False}


@router.put("/discord/config")
async def update_discord_config(
    config: DiscordWebhookConfig,
    request: Request,
    current_user: dict = Depends(get_current_admin_user)
):
    """Update Discord webhook configuration"""
    save_notification_config(CONFIG_KEY_DISCORD, config.model_dump())
    
    AuditService.log(
        user_id=current_user['id'],
        username=current_user['username'],
        action_type='update',
        category='system',
        target_type='notification_config',
        target_id='discord',
        details="Updated Discord notification settings",
        ip_address=request.client.host if request.client else None
    )
    
    return {"success": True, "message": "Discord configuration updated"}


async def send_discord_notification(title: str, message: str, color: int = 0x7289DA, fields: List[dict] = None):
    """Send notification to Discord webhook"""
    config = get_notification_config(CONFIG_KEY_DISCORD)
    if not config or not config.get('enabled') or not config.get('webhook_url'):
        return False
    
    embed = {
        "title": title,
        "description": message,
        "color": color,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "footer": {"text": "PEON Server Manager"}
    }
    
    if fields:
        embed["fields"] = fields
    
    payload = {"embeds": [embed]}
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                config['webhook_url'],
                json=payload,
                timeout=10
            ) as response:
                return response.status in [200, 204]
    except Exception as e:
        print(f"Discord notification failed: {e}")
        return False


# ============ Email Integration ============

@router.get("/email/config")
async def get_email_config(current_user: dict = Depends(get_current_admin_user)):
    """Get email notification configuration"""
    config = get_notification_config(CONFIG_KEY_EMAIL)
    if config:
        # Hide password
        config['smtp_password'] = '********' if config.get('smtp_password') else ''
    return config or {"enabled": False}


@router.put("/email/config")
async def update_email_config(
    config: EmailConfig,
    request: Request,
    current_user: dict = Depends(get_current_admin_user)
):
    """Update email notification configuration"""
    # Get existing config to preserve password if not changed
    existing = get_notification_config(CONFIG_KEY_EMAIL)
    config_dict = config.model_dump()
    
    if config_dict['smtp_password'] == '********' and existing:
        config_dict['smtp_password'] = existing.get('smtp_password', '')
    
    save_notification_config(CONFIG_KEY_EMAIL, config_dict)
    
    AuditService.log(
        user_id=current_user['id'],
        username=current_user['username'],
        action_type='update',
        category='system',
        target_type='notification_config',
        target_id='email',
        details="Updated email notification settings",
        ip_address=request.client.host if request.client else None
    )
    
    return {"success": True, "message": "Email configuration updated"}


async def send_email_notification(to_email: str, subject: str, body: str):
    """Send email notification (basic implementation)"""
    config = get_notification_config(CONFIG_KEY_EMAIL)
    if not config or not config.get('enabled'):
        return False
    
    try:
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        
        msg = MIMEMultipart()
        msg['From'] = config['from_email']
        msg['To'] = to_email
        msg['Subject'] = subject
        
        msg.attach(MIMEText(body, 'html'))
        
        server = smtplib.SMTP(config['smtp_host'], config['smtp_port'])
        server.starttls()
        server.login(config['smtp_user'], config['smtp_password'])
        server.send_message(msg)
        server.quit()
        
        return True
    except Exception as e:
        print(f"Email notification failed: {e}")
        return False


# ============ Test & Send Notifications ============

@router.post("/test")
async def test_notification(
    test_data: TestNotification,
    current_user: dict = Depends(get_current_admin_user)
):
    """Test notification channel"""
    if test_data.channel == 'discord':
        success = await send_discord_notification(
            title="🧪 Test Notification",
            message="This is a test notification from PEON Server Manager. If you see this, Discord notifications are working!",
            color=0x00FF00,
            fields=[
                {"name": "Sent by", "value": current_user['username'], "inline": True},
                {"name": "Time", "value": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"), "inline": True}
            ]
        )
        return {"success": success, "message": "Discord test notification sent" if success else "Failed to send Discord notification"}
    
    elif test_data.channel == 'email':
        if not test_data.recipient:
            raise HTTPException(status_code=400, detail="Email recipient required")
        
        success = await send_email_notification(
            to_email=test_data.recipient,
            subject="🧪 PEON Test Notification",
            body=f"""
            <html>
            <body style="font-family: Arial, sans-serif;">
                <h2>Test Notification</h2>
                <p>This is a test notification from PEON Server Manager.</p>
                <p>If you receive this email, your email notifications are configured correctly!</p>
                <hr>
                <p><small>Sent by: {current_user['username']}<br>
                Time: {datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")}</small></p>
            </body>
            </html>
            """
        )
        return {"success": success, "message": "Email test sent" if success else "Failed to send email"}
    
    raise HTTPException(status_code=400, detail="Invalid notification channel")


@router.post("/send")
async def send_notification(
    payload: NotificationPayload,
    current_user: dict = Depends(get_current_user)
):
    """Send a notification (internal use)"""
    discord_config = get_notification_config(CONFIG_KEY_DISCORD)
    
    results = {"discord": False, "email": False}
    
    # Determine color based on event type
    colors = {
        "server_start": 0x00FF00,  # Green
        "server_stop": 0xFF0000,   # Red
        "new_session": 0x7289DA,   # Discord blue
        "user_join": 0xFFFF00,     # Yellow
    }
    color = colors.get(payload.event_type, 0x808080)
    
    # Check if this event type should trigger Discord notification
    if discord_config and discord_config.get('enabled'):
        should_notify = False
        if payload.event_type == 'server_start' and discord_config.get('notify_server_start'):
            should_notify = True
        elif payload.event_type == 'server_stop' and discord_config.get('notify_server_stop'):
            should_notify = True
        elif payload.event_type == 'new_session' and discord_config.get('notify_new_session'):
            should_notify = True
        elif payload.event_type == 'user_join' and discord_config.get('notify_user_join'):
            should_notify = True
        
        if should_notify:
            fields = []
            if payload.server_name:
                fields.append({"name": "Server", "value": payload.server_name, "inline": True})
            if payload.session_title:
                fields.append({"name": "Session", "value": payload.session_title, "inline": True})
            
            results['discord'] = await send_discord_notification(
                title=payload.title,
                message=payload.message,
                color=color,
                fields=fields if fields else None
            )
    
    return {
        "success": results['discord'] or results['email'],
        "results": results
    }


# ============ Get All Notification Settings ============

@router.get("/status")
async def get_notification_status(current_user: dict = Depends(get_current_admin_user)):
    """Get status of all notification channels"""
    discord_config = get_notification_config(CONFIG_KEY_DISCORD)
    email_config = get_notification_config(CONFIG_KEY_EMAIL)
    
    return {
        "discord": {
            "configured": bool(discord_config and discord_config.get('webhook_url')),
            "enabled": bool(discord_config and discord_config.get('enabled'))
        },
        "email": {
            "configured": bool(email_config and email_config.get('smtp_host')),
            "enabled": bool(email_config and email_config.get('enabled'))
        }
    }
