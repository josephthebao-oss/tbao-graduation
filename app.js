(() => {
  "use strict";

  const CONFIG = window.SITE_CONFIG || {};
  const STORAGE_KEY = "tbao-graduation-wishes-v1";
  const SUPABASE_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

  const form = document.getElementById("wish-form");
  const nameInput = document.getElementById("sender-name");
  const messageInput = document.getElementById("wish-message");
  const submitButton = document.getElementById("submit-wish");
  const status = document.getElementById("form-status");
  const list = document.getElementById("wish-list");
  const emptyState = document.getElementById("empty-state");
  const template = document.getElementById("wish-template");

  let selectedAvatar = "🎓";
  let currentRecords = [];
  let supabase = null;

  const hasSupabase =
    typeof CONFIG.supabaseUrl === "string" &&
    typeof CONFIG.supabaseAnonKey === "string" &&
    CONFIG.supabaseUrl.trim() &&
    CONFIG.supabaseAnonKey.trim();

  function showStatus(message, type = "") {
    status.textContent = message;
    status.className = `form-status ${type}`.trim();
  }

  function formatDate(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  function sanitizeRecord(record) {
    return {
      id: String(record.id ?? record.__backendId ?? crypto.randomUUID()),
      sender_name: String(record.sender_name ?? "").slice(0, 60),
      message: String(record.message ?? "").slice(0, 500),
      avatar_icon: String(record.avatar_icon ?? "🎓").slice(0, 4),
      created_at: record.created_at ?? new Date().toISOString()
    };
  }

  function loadLocal() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function saveLocal(records) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }

  function renderWishes(records) {
    currentRecords = records
      .map(sanitizeRecord)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    list.innerHTML = "";

    currentRecords.forEach(record => {
      const fragment = template.content.cloneNode(true);
      const card = fragment.querySelector(".wish-card");
      card.dataset.recordId = record.id;

      card.querySelector(".wish-avatar").textContent = record.avatar_icon;
      card.querySelector(".wish-sender").textContent = record.sender_name || "Người gửi ẩn danh";
      card.querySelector(".wish-message").textContent = record.message;
      card.querySelector(".wish-date").textContent = formatDate(record.created_at);

      list.appendChild(fragment);
    });

    emptyState.classList.toggle("hidden", currentRecords.length > 0);
  }

  async function loadSupabaseClient() {
    if (!hasSupabase) return null;

    try {
      const module = await import(SUPABASE_CDN);
      supabase = module.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey);
      return supabase;
    } catch (error) {
      console.error("Supabase initialization failed:", error);
      return null;
    }
  }

  async function loadWishes() {
    if (supabase) {
      const { data, error } = await supabase
        .from("wishes")
        .select("id, sender_name, message, avatar_icon, created_at")
        .order("created_at", { ascending: false })
        .limit(999);

      if (!error) {
        renderWishes(data || []);
        return;
      }

      console.error(error);
      showStatus("Không thể tải bảng lưu niệm. Đang dùng dữ liệu trên thiết bị.", "error");
    }

    renderWishes(loadLocal());
  }

  async function addWish(record) {
    if (supabase) {
      const { data, error } = await supabase
        .from("wishes")
        .insert([record])
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    const records = loadLocal();
    records.unshift(record);
    saveLocal(records.slice(0, 999));
    return record;
  }

  document.querySelectorAll("[data-avatar]").forEach(button => {
    button.addEventListener("click", () => {
      selectedAvatar = button.dataset.avatar;
      document.querySelectorAll("[data-avatar]").forEach(item => {
        const active = item === button;
        item.classList.toggle("selected", active);
        item.setAttribute("aria-pressed", String(active));
      });
    });
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const senderName = nameInput.value.trim();
    const message = messageInput.value.trim();

    if (!senderName || !message) {
      showStatus("Vui lòng điền tên và lời chúc trước khi gửi.", "error");
      (!senderName ? nameInput : messageInput).focus();
      return;
    }

    if (message.length > 500 || senderName.length > 60) {
      showStatus("Nội dung vượt quá giới hạn cho phép.", "error");
      return;
    }

    if (currentRecords.length >= 999) {
      showStatus("Bảng lưu niệm đã đạt giới hạn 999 lời chúc.", "error");
      return;
    }

    submitButton.disabled = true;
    showStatus("Đang gửi lời chúc...", "");

    const record = {
      sender_name: senderName,
      message,
      avatar_icon: selectedAvatar,
      created_at: new Date().toISOString()
    };

    try {
      await addWish(record);
      form.reset();
      selectedAvatar = "🎓";
      document.querySelectorAll("[data-avatar]").forEach((item, index) => {
        const active = index === 0;
        item.classList.toggle("selected", active);
        item.setAttribute("aria-pressed", String(active));
      });

      await loadWishes();
      showStatus(
        supabase
          ? "Lời chúc của bạn đã được thêm vào bảng lưu niệm!"
          : "Đã lưu lời chúc trên thiết bị này. Để mọi người cùng thấy, hãy kết nối Supabase.",
        "success"
      );
    } catch (error) {
      console.error(error);
      showStatus("Không thể gửi lời chúc lúc này. Vui lòng thử lại.", "error");
    } finally {
      submitButton.disabled = false;
    }
  });

  async function initialize() {
    if (hasSupabase) {
      await loadSupabaseClient();
    }
    await loadWishes();

    // Realtime updates when Supabase is configured.
    if (supabase) {
      supabase
        .channel("wishes-live")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "wishes" },
          () => loadWishes()
        )
        .subscribe();
    }
  }

  initialize();
})();
