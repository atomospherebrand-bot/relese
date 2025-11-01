import os, logging, requests, random, time, re
import io
from datetime import datetime, timedelta, time as dtime, date
from dateutil import tz
from telegram import (
    InlineKeyboardMarkup, InlineKeyboardButton, InputMediaPhoto, InputMediaVideo, ParseMode, InputFile
)
from telegram.ext import (
    Updater, CommandHandler, CallbackQueryHandler, ConversationHandler,
    MessageHandler, Filters, CallbackContext
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("tattoo-bot")

# ===== API discovery =====
API_BASE = "http://212.34.130.28:6050"  # Жёстко пропишем публичный URL
log.info(f"Using API_BASE: {API_BASE}")
API_CANDIDATES = [
    API_BASE,
    "http://localhost:6050",
    "http://app:6050",
]
TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TZ = tz.gettz(os.getenv("TZ", "Europe/Moscow"))

# ===== Auth =====
import base64
AUTH = ("admin", "1XmgOOuLkGO8@")  # Из Login.tsx
auth_header = base64.b64encode(f"{AUTH[0]}:{AUTH[1]}".encode()).decode()


# ===== helpers =====

def send_photo_safe(target, url_or_path, caption, kb):
    try:
        target.reply_photo(url_or_path, caption=caption, parse_mode=ParseMode.MARKDOWN, reply_markup=kb)
        return
    except Exception as e:
        try:
            import requests, io
            r = requests.get(url_or_path, timeout=10)
            if r.ok and r.content:
                target.reply_photo(InputFile(io.BytesIO(r.content), filename='image.jpg'), caption=caption, parse_mode=ParseMode.MARKDOWN, reply_markup=kb)
                return
        except Exception as e2:
            log.warning(f"send_photo_safe: fallback failed: {e2}")
    target.reply_text(caption, parse_mode=ParseMode.MARKDOWN, reply_markup=kb)


# ===== navigation helpers (PATCH-6) =====
def safe_delete(message):
    try:
        message.delete()
    except Exception:
        pass

def edit_or_send_text(q, *args, **kwargs):
    """Try to edit message text; if it fails (e.g., original is a photo), delete and send a new one."""
    try:
        return q.edit_message_text(*args, **kwargs)
    except Exception as e:
        # Extract important kwargs for fallback
        text = None
        if args:
            text = args[0]
        if text is None:
            text = kwargs.get("text") or "..."
        reply_markup = kwargs.get("reply_markup")
        parse_mode = kwargs.get("parse_mode")
        try:
            safe_delete(q.message)
        except Exception:
            pass
        try:
            q.message.bot.send_message(
                chat_id=q.message.chat_id,
                text=text,
                reply_markup=reply_markup,
                parse_mode=parse_mode,
            )
        except Exception as e2:
            log.warning(f"edit_or_send_text fallback failed: {e2}")
        return None


# ===== messages cache =====
_MESSAGES_CACHE = {"ts": 0, "data": {}}

def safe_get_messages():
    try:
        now = time.time()
        if now - _MESSAGES_CACHE["ts"] < 60 and _MESSAGES_CACHE["data"]:
            return _MESSAGES_CACHE["data"]
        data = api_get("/api/messages") or {}
        items = data.get("messages", []) if isinstance(data, dict) else []
        out = {}
        for m in items:
            key = m.get("key")
            if not key: 
                continue
            out[key] = {
                "text": m.get("value") or "",
                "imageUrl": build_full_url(m.get("imageUrl") or m.get("image_url") or ""),
                "type": m.get("type") or "text",
            }
        _MESSAGES_CACHE["data"] = out
        _MESSAGES_CACHE["ts"] = now
        return out
    except Exception as e:
        log.warning("messages fetch failed: %s", e)
        return {}

def bot_text(key: str, default: str = "") -> str:
    msgs = safe_get_messages()
    val = (msgs.get(key) or {}).get("text") if msgs else None
    return val or default

def bot_image(key: str) -> str:
    msgs = safe_get_messages()
    val = (msgs.get(key) or {}).get("imageUrl") if msgs else None
    return val or ""

RU_DOW = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]


def build_full_url(relative_url):
    if not relative_url:
        return ""
    rel = str(relative_url).strip()
    if not rel:
        return ""
    if rel.startswith("http://") or rel.startswith("https://"):
        return rel
    base = API_BASE.rstrip("/")
    if rel.startswith("/"):
        return f"{base}{rel}"
    return f"{base}/{rel}"


def api_get(path, params=None):
    last_err = None
    for base in API_CANDIDATES:
        if not base: continue
        try:
            full_url = f"{base}{path}"
            log.debug(f"Attempting API get: {full_url}")
            r = requests.get(full_url, params=params or {}, timeout=10, headers={"Authorization": f"Basic {auth_header}"})
            r.raise_for_status()
            log.debug(f"API response status: {r.status_code}, content-type: {r.headers.get('Content-Type')}")
            return r.json()
        except Exception as e:
            log.debug(f"API get failed for {full_url}: {e}")
            last_err = e
    log.error(f"All API attempts failed: {last_err}")
    raise last_err

def api_post(path, payload):
    last_err = None
    for base in API_CANDIDATES:
        if not base: continue
        try:
            full_url = f"{base}{path}"
            log.debug(f"Attempting API post: {full_url}")
            r = requests.post(full_url, json=payload, timeout=15, headers={"Authorization": f"Basic {auth_header}"})
            r.raise_for_status()
            return r.json() if r.content else {}
        except Exception as e:
            try:
                txt = r.text
                log.warning("api_post %s failed: %s :: %s", full_url, e, txt)
            except: pass
            last_err = e
    log.error(f"All API post attempts failed: {last_err}")
    raise last_err

def notify_register_chat(booking_id: str, chat_id: int):
    try:
        api_post("/api/notifications/register-chat", {"bookingId": booking_id, "chatId": chat_id})
    except Exception as e:
        log.debug("notify_register_chat failed: %s", e)

def safe_get_settings():
    try:
        data = api_get("/api/settings")
        return data.get("settings", {}) if isinstance(data, dict) else {}
    except Exception as e:
        log.warning("settings fetch failed: %s", e)
        return {}

def safe_get_services():
    try:
        data = api_get("/api/services")
        items = data.get("services", []) if isinstance(data, dict) else []
        out = []
        for s in items:
            out.append({
                "id": s.get("id"),
                "name": s.get("name") or s.get("title") or "Услуга",
                "duration": int(s.get("duration", 60)),
                "price": int(s.get("price", 0)),
            })
        return out
    except Exception as e:
        log.warning("services fetch failed: %s", e)
        return []

def safe_get_portfolio():
    try:
        data = api_get("/api/portfolio")
        items = data.get("portfolio", []) if isinstance(data, dict) else []
        out = []
        for p in items:
            out.append({
                "id": p.get("id"),
                "url": p.get("url"),
                "title": p.get("title") or "",
                "mediaType": p.get("mediaType") or "image",
                "masterId": p.get("masterId"),
                "style": p.get("style") or "",
                "thumbnail": p.get("thumbnail"),
            })
        return out
    except Exception as e:
        log.warning("portfolio fetch failed: %s", e)
        return []

def safe_get_masters():
    try:
        data = api_get("/api/masters")
        items = data.get("masters", []) if isinstance(data, dict) else []
        out = []
        for m in items:
            out.append({
                "id": m.get("id"),
                "name": m.get("name") or m.get("title") or "Мастер",
                "nickname": m.get("nickname") or "",
                "telegram": m.get("telegram") or "",
                "specialization": m.get("specialization") or "",
                "avatar": m.get("avatar") or "",
                "teletypeUrl": build_full_url(m.get("teletypeUrl")) or "",
                "isActive": bool(m.get("isActive", m.get("active", True))),
            })
        return out
    except Exception as e:
        log.warning("masters fetch failed: %s", e)
        return []

def safe_get_bookings():
    try:
        data = api_get("/api/bookings")
        return data.get("bookings", []) if isinstance(data, dict) else []
    except Exception as e:
        log.warning("bookings fetch failed: %s", e)
        return []

def safe_create_booking(payload):
    try:
        return api_post("/api/bookings", payload)
    except Exception as e:
        log.warning("booking create failed: %s", e)
        return None

def money(v: int) -> str:
    try:
        return f"{int(v):,}".replace(",", " ") + " ₽"
    except:
        return str(v)

def has_future_booking_for_user(user_id: int) -> bool:
    now = datetime.now(tz=TZ)
    for b in safe_get_bookings():
        uid = b.get("userId") or b.get("telegramId")
        status = (b.get("status") or "").lower()
        if uid == user_id and status not in ("canceled", "cancelled", "done", "completed"):
            dt = b.get("dateTime") or b.get("start") or b.get("date")
            try:
                t = datetime.fromisoformat(dt.replace("Z","+00:00") if "Z" in str(dt) else dt)
                if t.tzinfo is None: t = t.replace(tzinfo=TZ)
                if t >= now:
                    return True
            except: pass
    return False

# ===== ui =====
def kb_main():
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("🗓 Записаться", callback_data="book")],
        [InlineKeyboardButton("🧭 Как добраться", callback_data="route"),
         InlineKeyboardButton("👥 О мастерах", callback_data="about")],
        [InlineKeyboardButton("📜 Сертификаты", callback_data="certs")],
        [InlineKeyboardButton("💳 Оплата", callback_data="pay")],
    ])

def kb_back_home():
    return InlineKeyboardMarkup([[InlineKeyboardButton("↩️ Назад", callback_data="home")]])

def kb_master_card(master_id, teletype_url):
    teletype_url = build_full_url(teletype_url) if teletype_url else ""
    btn_detail = InlineKeyboardButton("Подробнее", url=teletype_url) if teletype_url else InlineKeyboardButton("Подробнее", callback_data=f"detail:{master_id}")
    return InlineKeyboardMarkup([
        [
            btn_detail,
            InlineKeyboardButton("Портфолио", callback_data=f"portfolio:{master_id}")
        ],
        [InlineKeyboardButton("↩️ Назад", callback_data="home")]
    ])


# ===== home helpers =====
def show_home(update_or_query, kb=None):
    s = safe_get_settings()
    welcome_text = bot_text("welcome", s.get("welcomeText") or (
        "👋 Привет! Я бот тату-студии.\n"
        "• Запись в пару кликов\n• Напомню о визите\n• Покажу маршрут до студии\n"
        "• Расскажу о мастерах, портфолио и сертификатах\n\nРаботаю 24/7."
    ))
    welcome_img = bot_image("welcome")
    kb = kb or kb_main()
    # always try to send photo for home
    try:
        if getattr(update_or_query, "message", None):
            if welcome_img:
                send_photo_safe(update_or_query.message, welcome_img, welcome_text, kb)
            else:
                update_or_query.message.reply_text(welcome_text, parse_mode=ParseMode.MARKDOWN, reply_markup=kb)
        else:
            q = update_or_query.callback_query
            if welcome_img:
                try:
                    q.message.delete()
                except Exception:
                    pass
                send_photo_safe(q.message, welcome_img, welcome_text, kb)
            else:
                edit_or_send_text(q, welcome_text, parse_mode=ParseMode.MARKDOWN, reply_markup=kb)
    except Exception as e:
        log.warning("show_home failed: %s", e)

def go_home(update_or_query, ctx: CallbackContext):
    # reset conversation state if any and show home
    try:
        if getattr(update_or_query, "callback_query", None):
            update_or_query.callback_query.answer()
    except Exception:
        pass
    show_home(update_or_query, kb_main())
    return ConversationHandler.END
# ===== conversation states =====
(
    S_CAPTCHA,     # капча при первом входе
    S_SVC,         # выбор услуги
    S_DATE,        # выбор даты
    S_TIME,        # выбор времени
    S_MASTER,      # выбор мастера
    S_NAME,        # ввод имени
    S_PHONE,       # ввод телефона
) = range(7)

verified = set()
captcha = {}

# ===== /start + captcha =====
def cmd_start(update, ctx: CallbackContext):
    uid = update.effective_user.id
    if uid not in verified:
        a,b = random.randint(1,9), random.randint(1,9)
        captcha[uid]=(a,b)
        update.message.reply_text(
            f"Привет! Для защиты от спама реши капчу: *{a}+{b}* = ?",
            parse_mode=ParseMode.MARKDOWN
        )
        return S_CAPTCHA
    send_home_text(update, ctx)
    return ConversationHandler.END

def on_captcha(update, ctx: CallbackContext):
    uid = update.effective_user.id
    ans = update.message.text.strip()
    a,b = captcha.get(uid,(None,None))
    if a is None: return ConversationHandler.END
    if ans.isdigit() and int(ans)==a+b:
        verified.add(uid); captcha.pop(uid,None)
        send_home_text(update, ctx)
        return ConversationHandler.END
    update.message.reply_text("Неа. Пришли число ещё раз.")
    return S_CAPTCHA


def send_home_text(update_or_query, ctx: CallbackContext):
    s = safe_get_settings()
    # Prefer admin-managed message with key "welcome"
    welcome_text = bot_text("welcome", s.get("welcomeText") or (
        "👋 Привет! Я бот тату-студии.\n"
        "• Запись в пару кликов\n• Напомню о визите\n• Покажу маршрут до студии\n"
        "• Расскажу о мастерах, портфолио и сертификатах\n\nРаботаю 24/7."
    ))
    welcome_img = bot_image("welcome")
    kb = kb_main()
    if getattr(update_or_query, "message", None):
        if welcome_img:
            try:
                send_photo_safe(update_or_query.message, welcome_img, welcome_text, kb)
            except Exception as e:
                log.warning("send_photo failed, fallback to text: %s", e)
                update_or_query.message.reply_text(welcome_text, parse_mode=ParseMode.MARKDOWN, reply_markup=kb)
        else:
            update_or_query.message.reply_text(welcome_text, parse_mode=ParseMode.MARKDOWN, reply_markup=kb)
    else:
        q = update_or_query.callback_query
        if welcome_img:
            try:
                # edit message media if possible, else send new
                send_photo_safe(q.message, welcome_img, welcome_text, kb)
                q.delete_message()
            except Exception as e:
                log.warning("edit to photo failed: %s", e)
                edit_or_send_text(q, welcome_text, parse_mode=ParseMode.MARKDOWN, reply_markup=kb)
        else:
            edit_or_send_text(q, welcome_text, parse_mode=ParseMode.MARKDOWN, reply_markup=kb)

# ===== entry for booking is INSIDE ConversationHandler =====
def entry_book(update, ctx: CallbackContext):
    q = update.callback_query
    q.answer()

    # запрет на множественные записи
    uid = q.from_user.id
    if has_future_booking_for_user(uid):
        edit_or_send_text(q, 
            "У тебя уже есть активная запись. Если нужно изменить время — напиши администратору или дождись завершения визита.",
            reply_markup=kb_back_home()
        )
        return ConversationHandler.END

    services = safe_get_services()
    if not services:
        edit_or_send_text(q, "Нет доступных услуг. Попробуй позже.", reply_markup=kb_back_home())
        return ConversationHandler.END

    ctx.user_data.clear()
    ctx.user_data["services"] = {str(s["id"]): s for s in services}
    kb = [[InlineKeyboardButton(f"{s['name']} • {money(s['price'])}", callback_data=f"svc:{s['id']}")] for s in services[:30]]
    kb.append([InlineKeyboardButton("↩️ Назад", callback_data="home")])
    edit_or_send_text(q, "Выбери услугу:", reply_markup=InlineKeyboardMarkup(kb))
    return S_SVC

def pick_service(update, ctx: CallbackContext):
    q = update.callback_query; q.answer()
    _, sid = q.data.split(":",1)
    ctx.user_data["svc_id"]=sid
    svc = ctx.user_data["services"].get(sid,{})
    dur = int(svc.get("duration",60))

    # 30 дней вперёд, русские дни недели
    today = date.today()
    days = [today + timedelta(days=i) for i in range(30)]
    rows,row=[],[]
    for i,d in enumerate(days,1):
        dow = RU_DOW[d.weekday()]
        rowsel = InlineKeyboardButton(d.strftime(f"%d.%m ({dow})"), callback_data=f"d:{d.isoformat()}")
        row.append(rowsel)
        if i%3==0: rows.append(row); row=[]
    if row: rows.append(row)
    rows.append([InlineKeyboardButton("↩️ Назад", callback_data="book")])

    edit_or_send_text(q, 
        f"Услуга: *{svc.get('name','Услуга')}*\nДлительность: {dur} мин\n\nВыбери дату:",
        parse_mode=ParseMode.MARKDOWN,
        reply_markup=InlineKeyboardMarkup(rows)
    )
    return S_DATE

def pick_date(update, ctx: CallbackContext):
    q = update.callback_query; q.answer()
    _, ds = q.data.split(":",1)
    ctx.user_data["date"]=ds
    svc = ctx.user_data["services"].get(ctx.user_data["svc_id"],{})
    dur = int(svc.get("duration",60))

    # занято:
    taken=set()
    for b in safe_get_bookings():
        dt = b.get("dateTime") or b.get("start") or b.get("date")
        try:
            t = datetime.fromisoformat(dt.replace("Z","+00:00") if "Z" in str(dt) else dt)
            if t.tzinfo is None: t = t.replace(tzinfo=TZ)
            t = t.astimezone(TZ)
            taken.add(t.strftime("%H:%M"))
        except: pass

    base = datetime.combine(datetime.fromisoformat(ds).date(), dtime(10,0), tzinfo=TZ)
    end  = datetime.combine(datetime.fromisoformat(ds).date(), dtime(20,0), tzinfo=TZ)

    slots=[]; cur=base
    while cur+timedelta(minutes=dur) <= end:
        label=cur.strftime("%H:%M")
        if label not in taken: slots.append(label)
        cur+=timedelta(minutes=dur)

    if not slots:
        edit_or_send_text(q, "Свободных слотов нет. Выбери другую дату.", reply_markup=kb_back_home())
        return S_TIME

    rows,row=[],[]
    for i,s in enumerate(slots,1):
        row.append(InlineKeyboardButton(s, callback_data=f"t:{s}"))
        if i%4==0: rows.append(row); row=[]
    if row: rows.append(row)
    rows.append([InlineKeyboardButton("↩️ Назад", callback_data=f"svc:{ctx.user_data['svc_id']}")])

    edit_or_send_text(q, "Выбери время:", reply_markup=InlineKeyboardMarkup(rows))
    return S_TIME

def pick_time(update, ctx: CallbackContext):
    q = update.callback_query; q.answer()
    _, ts = q.data.split(":",1)
    ctx.user_data["time"]=ts

    # выбрать мастера (только активных)
    masters = [m for m in safe_get_masters() if m.get("isActive", True)]
    if not masters:
        edit_or_send_text(q, "Пока нет активных мастеров. Попробуй позже.", reply_markup=kb_back_home())
        return ConversationHandler.END

    ctx.user_data["masters"] = {str(m["id"]): m for m in masters if m.get("id")}
    rows=[]
    for m in masters[:25]:
        label = m["name"]
        if m.get("specialization"): label += f" • {m['specialization']}"
        rows.append([InlineKeyboardButton(label, callback_data=f"m:{m['id']}")])
    rows.append([InlineKeyboardButton("↩️ Назад", callback_data=f"d:{ctx.user_data['date']}")])
    edit_or_send_text(q, "К кому записаться?", reply_markup=InlineKeyboardMarkup(rows))
    return S_MASTER

def pick_master(update, ctx: CallbackContext):
    q = update.callback_query; q.answer()
    _, mid = q.data.split(":",1)
    ctx.user_data["master_id"]=mid
    # спрашиваем имя
    edit_or_send_text(q, 
        "Как к тебе обращаться? Напиши имя (можно просто как тебя обычно называют).",
        reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("↩️ Назад", callback_data=f"t:{ctx.user_data['time']}")]])
    )
    return S_NAME

def ask_phone(update, ctx: CallbackContext):
    name = update.message.text.strip()
    if not name or len(name)<2:
        update.message.reply_text("Имя слишком короткое. Пришли нормальное имя 🙂")
        return S_NAME
    ctx.user_data["customer_name"]=name
    update.message.reply_text(
        "Огонь! А теперь номер телефона для связи (в любом формате, можно +7... или 8...).",
    )
    return S_PHONE

PHONE_RX = re.compile(r"^\+?\d[\d \-\(\)]{8,}$")

def finalize_booking(update, ctx: CallbackContext):
    phone = update.message.text.strip()
    if not PHONE_RX.match(phone):
        update.message.reply_text("Кажется, это не похоже на номер. Пришли номер в формате +7XXXXXXXXXX.")
        return S_PHONE

    # Проверка данных
    if not all(k in ctx.user_data for k in ["customer_name", "svc_id", "date", "time", "master_id"]):
        update.message.reply_text("Произошла ошибка: не все данные собраны. Попробуй заново.", reply_markup=kb_back_home())
        return ConversationHandler.END

    # Финальный payload
    ds = ctx.user_data["date"]
    ts = ctx.user_data["time"]
    dt_iso = f"{ds}T{ts}:00"

    svc = ctx.user_data["services"].get(ctx.user_data["svc_id"], {})
    payload = {
        "clientName": ctx.user_data.get("customer_name"),
        "clientPhone": phone,
        "serviceId": ctx.user_data["svc_id"],
        "masterId": ctx.user_data.get("master_id"),
        "date": ds,  # Явная передача даты
        "time": ts,  # Явная передача времени
        "dateTime": dt_iso,
        "username": update.effective_user.username,
        "userId": update.effective_user.id,
    }

    created = safe_create_booking(payload)
    if not created:
        update.message.reply_text(
            "Не удалось подтвердить запись (возможно, слот успели занять). Попробуй другое время.",
            reply_markup=kb_back_home()
        )
        return ConversationHandler.END

    s = safe_get_settings()
    address = s.get("address", "Адрес уточним в чате")
    when = datetime.fromisoformat(dt_iso).astimezone(TZ).strftime("%d.%m.%Y • %H:%M")
    txt = (
        "✅ *Запись подтверждена!*\n\n"
        f"*Услуга:* {svc.get('name', 'Услуга')}\n"
        f"*Мастер:* { (ctx.user_data.get('masters', {}).get(ctx.user_data.get('master_id'), {}).get('name')) or 'Любой'}\n"
        f"*Дата и время:* {when}\n"
        f"*Адрес:* {address}\n\n"
        "До встречи! Напоминание прилетит заранее."
    )
    update.message.reply_text(txt, parse_mode=ParseMode.MARKDOWN, reply_markup=kb_back_home())
    try:
        bid = (created.get("id") or (created.get("booking") or {}).get("id"))
        if bid:
            notify_register_chat(str(bid), update.effective_chat.id)
    except Exception as e:
        log.debug("register chat failed: %s", e)
    return ConversationHandler.END

# ===== safe media helpers =====
def safe_send_photo(bot, chat_id, photo_url, caption=None, reply_markup=None, parse_mode=None):
    try:
        r = requests.get(photo_url, timeout=10, headers={"Authorization": f"Basic {auth_header}"})
        r.raise_for_status()
        log.debug(f"Sending photo: size={len(r.content)}, type={r.headers.get('Content-Type')}")
        bot.send_photo(
            chat_id=chat_id,
            photo=InputFile(io.BytesIO(r.content), filename="photo.png"),
            caption=caption,
            reply_markup=reply_markup,
            parse_mode=parse_mode
        )
    except Exception as e:
        log.warning(f"safe_send_photo failed: {e} for URL {photo_url}")
        try:
            bot.send_message(
                chat_id=chat_id,
                text="⚠️ Не удалось отправить изображение.",
                reply_markup=reply_markup
            )
        except Exception as _:
            log.debug("failed to notify user about photo send failure")

def safe_send_video(bot, chat_id, video_url, caption=None, reply_markup=None, parse_mode=None):
    try:
        r = requests.get(video_url, timeout=15, headers={"Authorization": f"Basic {auth_header}"})
        r.raise_for_status()
        log.debug(f"Sending video: size={len(r.content)}, type={r.headers.get('Content-Type')}")
        bot.send_video(
            chat_id=chat_id,
            video=InputFile(io.BytesIO(r.content), filename="video.mp4"),
            caption=caption,
            reply_markup=reply_markup,
            parse_mode=parse_mode,
            supports_streaming=True
        )
    except Exception as e:
        log.warning(f"safe_send_video failed: {e} for URL {video_url}")
        try:
            bot.send_message(
                chat_id=chat_id,
                text="⚠️ Не удалось отправить видео.",
                reply_markup=reply_markup
            )
        except Exception as _:
            log.debug("failed to notify user about video send failure")

def safe_send_media_group(bot, chat_id, media_list):
    from telegram import InputMediaPhoto as _IMP, InputMediaVideo as _IMV
    group = []
    for m in media_list:
        try:
            url = m.get("url")
            caption = m.get("caption")
            t = m.get("type")
            r = requests.get(url, timeout=15, headers={"Authorization": f"Basic {auth_header}"})
            r.raise_for_status()
            log.debug(f"Media for group: url={url}, size={len(r.content)}, type={r.headers.get('Content-Type')}")
            content = io.BytesIO(r.content)
            if t == "video":
                group.append(_IMV(media=InputFile(content, filename="video.mp4"), caption=caption))
            else:
                group.append(_IMP(media=InputFile(content, filename="photo.png"), caption=caption))
        except Exception as e:
            log.warning(f"skip media {m.get('url')}: {e}")
    if group:
        try:
            bot.send_media_group(chat_id=chat_id, media=group)
        except Exception as e:
            log.warning(f"media group send failed: {e}")
            # fallback to individual sends
            for item in group:
                try:
                    if isinstance(item, _IMV):
                        bot.send_video(chat_id=chat_id, video=item.media, caption=item.caption, supports_streaming=True)
                    else:
                        bot.send_photo(chat_id=chat_id, photo=item.media, caption=item.caption)
                except Exception as ie:
                    log.warning(f"individual media send failed: {ie}")

# ===== generic buttons out of conversation =====
def btn(update, ctx: CallbackContext):
    q = update.callback_query
    q.answer()
    data = q.data

    if data == "home":
        send_home_text(update, ctx)
        return

    if data == "route":
        try:
            safe_delete(q.message)
        except Exception:
            pass
        s = safe_get_settings()
        address = s.get("address", "Адрес не указан")

        lat = s.get("lat") or s.get("latitude")
        lon = s.get("lng") or s.get("lon") or s.get("longitude")

        try:
            if isinstance(lat, str):
                lat = lat.strip()
            if isinstance(lon, str):
                lon = lon.strip()
        except:
            pass

        parts = [f"📍 *Адрес:* {address}"]

        if lat and lon:
            yan_link = f"https://yandex.ru/maps/?pt={lon},{lat}&z=16&l=map"
            goo_link = f"https://maps.google.com/?q={lat},{lon}"
            parts.append(f"[Открыть в Яндекс.Картах]({yan_link})")
            parts.append(f"[Открыть в Google Maps]({goo_link})")

            static_candidates = [
                f"https://static-maps.yandex.ru/1.x/?ll={lon},{lat}&z=16&l=map&size=650,300&pt={lon},{lat},pm2blm&lang=ru_RU",
                f"https://staticmap.openstreetmap.de/staticmap.php?center={lat},{lon}&zoom=16&size=650x300&markers={lat},{lon}",
            ]
            sent_any = False
            for url in static_candidates:
                try:
                    safe_send_photo(q.message.bot, q.message.chat_id, url)
                    sent_any = True
                    break
                except Exception as e:
                    log.debug("static map try failed: %s", e)

            try:
                q.message.bot.send_location(
                    chat_id=q.message.chat_id,
                    latitude=float(lat),
                    longitude=float(lon),
                )
                sent_any = True
            except Exception as e:
                log.debug("send_location failed: %s", e)

        q.message.bot.send_message(
            chat_id=q.message.chat_id,
            text="\n".join(parts),
            parse_mode=ParseMode.MARKDOWN,
            reply_markup=kb_back_home(),
        )
        return

    if data == "about":
        try:
            safe_delete(q.message)
        except Exception:
            pass
        masters = safe_get_masters()
        active = [m for m in masters if m.get("isActive", True)]
        if not active:
            edit_or_send_text(q, "Пока нет активных мастеров.", reply_markup=kb_back_home())
            return

        from telegram.utils.helpers import escape_markdown
        for m in active[:10]:
            caption = f"*{escape_markdown(m['name'], version=2)}*\n"
            if m.get("nickname"):
                caption += f"@{escape_markdown(m['nickname'], version=2)}\n"
            if m.get("specialization"):
                caption += f"Стили: {escape_markdown(m['specialization'], version=2)}\n"

            kb = kb_master_card(m["id"], m.get("teletypeUrl"))
            avatar = m.get("avatar")
            full_avatar = build_full_url(avatar) if avatar else None
            if full_avatar:
                try:
                    log.debug(f"Sending avatar for {m['name']}: {full_avatar}")
                    r = requests.head(full_avatar, timeout=5, headers={"Authorization": f"Basic {auth_header}"})
                    log.debug(f"Avatar HEAD response: status={r.status_code}, content-type={r.headers.get('Content-Type')}")
                    # use safe_send_photo with bot and chat_id
                    safe_send_photo(q.message.bot, q.message.chat_id, full_avatar, caption=caption, parse_mode=ParseMode.MARKDOWN_V2, reply_markup=kb)
                except Exception as e:
                    log.warning("photo send failed: %s for URL %s", e, full_avatar)
                    q.message.bot.send_message(
                        chat_id=q.message.chat_id,
                        text=caption,
                        parse_mode=ParseMode.MARKDOWN_V2,
                        reply_markup=kb
                    )
            else:
                log.warning(f"Invalid or empty avatar URL for {m['name']}: {avatar}")
                q.message.bot.send_message(
                    chat_id=q.message.chat_id,
                    text=caption,
                    parse_mode=ParseMode.MARKDOWN_V2,
                    reply_markup=kb
                )
        q.message.reply_text("Это наши мастера 👆", reply_markup=kb_back_home())
        return

    if data.startswith("portfolio:"):
        master_id = data.split(":", 1)[1]
        masters = {m["id"]: m for m in safe_get_masters()}
        master = masters.get(master_id, {})
        portfolio = safe_get_portfolio()
        master_works = [p for p in portfolio if p.get("masterId") == master_id]
        styles = list(set(p["style"] for p in master_works if p["style"]))
        if not styles:
            q.message.bot.send_message(
                chat_id=q.message.chat_id,
                text="У мастера нет указанных стилей.",
                reply_markup=kb_back_home()
            )
            return

        kb = [[InlineKeyboardButton(style.strip(), callback_data=f"style:{master_id}:{style.strip()}")] for style in styles]
        kb.append([InlineKeyboardButton("↩️ Назад", callback_data="about")])
        # Instead of edit, delete the original and send new
        try:
            q.message.delete()
        except Exception as e:
            log.debug(f"Failed to delete message for portfolio: {e}")
        q.message.bot.send_message(
            chat_id=q.message.chat_id,
            text=f"Выбери стиль для портфолио {master.get('name','')}:",
            reply_markup=InlineKeyboardMarkup(kb)
        )
        return

    if data.startswith("style:"):
        try:
            safe_delete(q.message)
        except Exception:
            pass
        _, master_id, selected_style = q.data.split(":", 2)
        portfolio = safe_get_portfolio()
        master_works = [p for p in portfolio if p.get("masterId") == master_id and p.get("style") == selected_style]
        if not master_works:
            q.message.bot.send_message(
                chat_id=q.message.chat_id,
                text="Работы мастера не найдены.",
                reply_markup=kb_back_home()
            )
            return

        bot = q.message.bot
        chat_id = q.message.chat_id
        sent_count = 0
        for work in master_works[:5]:
            if work.get("url"):
                full_url = build_full_url(work.get("url"))
                log.debug(f"Processing media for {work.get('title')}: url={full_url}, type={work.get('mediaType','image')}")
                try:
                    r_head = requests.head(full_url, timeout=5, headers={"Authorization": f"Basic {auth_header}"})
                    log.debug(f"Media HEAD response: status={r_head.status_code}, content-type={r_head.headers.get('Content-Type')}")
                    r = requests.get(full_url, timeout=15, headers={"Authorization": f"Basic {auth_header}"})
                    r.raise_for_status()
                    log.debug(f"Media GET: size={len(r.content)}, type={r.headers.get('Content-Type')}")
                    buf = io.BytesIO(r.content)
                    caption = work.get("title") or selected_style
                    if work.get("mediaType") == "video":
                        safe_send_video(bot, chat_id, full_url, caption=caption)
                    else:
                        safe_send_photo(bot, chat_id, full_url, caption=caption)
                    sent_count += 1
                except Exception as e:
                    log.warning(f"failed to load or send media {full_url}: {e}")

        if sent_count > 0:
            q.message.reply_text("Работы мастера", reply_markup=kb_back_home())
        else:
            q.message.bot.send_message(
                chat_id=chat_id,
                text="Изображения или видео работ не найдены или не удалось отправить.",
                reply_markup=kb_back_home()
            )
        return

    if data=="certs":
        try:
            safe_delete(q.message)
        except Exception:
            pass
        s = safe_get_settings()
        links = [x.strip() for x in (s.get("certificates") or "").split(",") if x.strip()]
        if links:
            # попытаемся скачать и отправить безопасно
            media_items = []
            for u in links[:10]:
                try:
                    fu = build_full_url(u)
                    r = requests.get(fu, timeout=10, headers={"Authorization": f"Basic {auth_header}"})
                    r.raise_for_status()
                    log.debug(f"Cert: url={fu}, size={len(r.content)}, type={r.headers.get('Content-Type')}")
                    buf = io.BytesIO(r.content)
                    media_items.append({"url": fu, "caption": None, "type": "image", "buf": buf})
                except Exception as e:
                    log.debug("cert download failed: %s", e)
            if media_items:
                # используем safe_send_media_group or fallback to send_media_group with InputMediaPhoto
                group = []
                for m in media_items:
                    m_buf = m.get("buf")
                    if m_buf:
                        group.append(InputMediaPhoto(media=InputFile(m_buf, filename="cert.png")))
                try:
                    q.message.bot.send_media_group(chat_id=q.message.chat_id, media=group)
                except Exception as e:
                    log.debug("certs media group failed: %s", e)
                    # fallback to individual
                    for g in group:
                        try:
                            q.message.bot.send_photo(chat_id=q.message.chat_id, photo=g.media)
                        except Exception as ie:
                            log.warning(f"cert individual failed: {ie}")
            q.message.reply_text("Сертификаты", reply_markup=kb_back_home())
        else:
            # For no links, use delete + send if necessary, but since it's edit, check if original is text
            try:
                edit_or_send_text(q, "Сертификаты пока не загружены.", reply_markup=kb_back_home())
            except Exception as e:
                if "no text in the message to edit" in str(e):
                    try:
                        q.message.delete()
                    except:
                        pass
                    q.message.bot.send_message(
                        chat_id=q.message.chat_id,
                        text="Сертификаты пока не загружены.",
                        reply_markup=kb_back_home()
                    )
                else:
                    raise
        return

    if data=="pay":
        try:
            safe_delete(q.message)
        except Exception:
            pass
        s = safe_get_settings()
        pay = s.get("paymentInfo") or (
            "💳 *Оплата*\n\n"
            "• Наличные в студии\n"
            "• СБП (по номеру телефона)\n"
            "• Банковские карты\n"
            "• Криптовалюта (по запросу)\n\n"
            "_Депозит фиксирует слот и вычитается из стоимости сеанса._"
        )
        try:
            edit_or_send_text(q, pay, parse_mode=ParseMode.MARKDOWN, reply_markup=kb_back_home())
        except Exception as e:
            if "no text in the message to edit" in str(e):
                try:
                    q.message.delete()
                except:
                    pass
                q.message.bot.send_message(
                    chat_id=q.message.chat_id,
                    text=pay,
                    parse_mode=ParseMode.MARKDOWN,
                    reply_markup=kb_back_home()
                )
            else:
                raise
        return

def cmd_ping(u, c): u.message.reply_text("pong")

def error_handler(update, context):
    log.error(f"Exception while handling an update: {context.error}")
    if update and update.effective_message:
        update.effective_message.reply_text("Произошла ошибка. Попробуйте заново.")

def main():
    if not TOKEN:
        log.error("TELEGRAM_BOT_TOKEN is empty – set token in admin.")
        while True: time.sleep(30)

    upd = Updater(TOKEN, use_context=True)
    dp = upd.dispatcher

    conv = ConversationHandler(
        entry_points=[
            CommandHandler("start", cmd_start),
            CallbackQueryHandler(entry_book, pattern=r"^book$"),
        ],
        states={
            S_CAPTCHA: [MessageHandler(Filters.text & ~Filters.command, on_captcha)],
            S_SVC:     [CallbackQueryHandler(pick_service, pattern=r"^svc:.+")],
            S_DATE:    [CallbackQueryHandler(pick_date,    pattern=r"^d:.+")],
            S_TIME:    [CallbackQueryHandler(pick_time,    pattern=r"^t:.+")],
            S_MASTER:  [CallbackQueryHandler(pick_master,  pattern=r"^m:.+")],
            S_NAME:    [MessageHandler(Filters.text & ~Filters.command, ask_phone)],
            S_PHONE:   [MessageHandler(Filters.text & ~Filters.command, finalize_booking)],
        },
        fallbacks=[CallbackQueryHandler(btn)],
        allow_reentry=True
    )

    dp.add_handler(conv)
    dp.add_handler(CallbackQueryHandler(btn))
    dp.add_handler(CommandHandler("ping", cmd_ping))
    dp.add_error_handler(error_handler)

    log.info("Bot starting polling...")
    upd.start_polling()
    upd.idle()

if __name__ == "__main__":
    main()