import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import Navbar from "../components/Navbar/Navbar";
import { API_URL } from "../utils/api";
import "../assets/styles/AdminAds.scss";

const PLACEMENTS = [
  { value: "home_top", label: "Home - top banner" },
  { value: "home_sidebar", label: "Home - sidebar" },
  { value: "latest_top", label: "Latest - top banner" },
  { value: "top_viewed_top", label: "Top viewed - top banner" },
  { value: "movie_detail_below_player", label: "Movie detail - below player" },
  { value: "movie_detail_sidebar", label: "Movie detail - sidebar" },
  { value: "floating_bottom", label: "Global - floating bottom" },
];

const EMPTY_FORM = {
  title: "",
  placement: "home_top",
  format: "image",
  imageUrl: "",
  targetUrl: "",
  html: "",
  altText: "",
  ctaLabel: "",
  width: "100%",
  height: 90,
  priority: 0,
  isActive: true,
  startsAt: "",
  endsAt: "",
  openInNewTab: true,
  notes: "",
};

function toDateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

function buildPreviewHtml(html = "") {
  return `<!doctype html><html><head><base target="_blank" /><style>html,body{margin:0;background:transparent;overflow:hidden;width:100%;min-height:100%;font-family:Arial,sans-serif}body{display:flex;align-items:center;justify-content:center}img,iframe,video{max-width:100%}</style></head><body>${html}</body></html>`;
}

export default function AdminAds() {
  const { user } = useSelector((state) => state.auth);
  const authToken = user?.token || user?.accessToken || "";

  const [ads, setAds] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const authHeaders = useMemo(
    () => (authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    [authToken]
  );

  const parseJsonSafe = async (res) => {
    const text = await res.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      throw new Error(text || "Invalid server response");
    }
  };

  const loadAds = async () => {
    if (!authToken) return;

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(`${API_URL}/ads/admin`, {
        headers: {
          ...authHeaders,
        },
      });
      const data = await parseJsonSafe(res);

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Cannot load ads");
      }

      setAds(data.items || []);
    } catch (err) {
      setMessage(err.message || "Cannot load ads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const resetForm = () => {
    setEditingId("");
    setForm(EMPTY_FORM);
    setMessage("");
  };

  const editAd = (ad) => {
    setEditingId(ad._id);
    setForm({
      title: ad.title || "",
      placement: ad.placement || "home_top",
      format: ad.format || "image",
      imageUrl: ad.imageUrl || "",
      targetUrl: ad.targetUrl || "",
      html: ad.html || "",
      altText: ad.altText || "",
      ctaLabel: ad.ctaLabel || "",
      width: ad.width || "100%",
      height: ad.height || 90,
      priority: ad.priority || 0,
      isActive: ad.isActive !== false,
      startsAt: toDateInput(ad.startsAt),
      endsAt: toDateInput(ad.endsAt),
      openInNewTab: ad.openInNewTab !== false,
      notes: ad.notes || "",
    });
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const uploadImage = async (file) => {
    if (!file) return;
    if (!authToken) {
      setMessage("Missing admin token");
      return;
    }

    setUploading(true);
    setMessage("");

    try {
      const body = new FormData();
      body.append("image", file);

      const res = await fetch(`${API_URL}/upload/image`, {
        method: "POST",
        headers: {
          ...authHeaders,
        },
        body,
      });
      const data = await parseJsonSafe(res);

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Upload failed");
      }

      setForm((prev) => ({
        ...prev,
        format: "image",
        imageUrl: data.url || "",
      }));
      setMessage("Image uploaded");
    } catch (err) {
      setMessage(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const saveAd = async (e) => {
    e.preventDefault();

    if (!authToken) {
      setMessage("Missing admin token");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const payload = {
        ...form,
        height: Number(form.height) || 90,
        priority: Number(form.priority) || 0,
      };

      const url = editingId
        ? `${API_URL}/ads/${editingId}`
        : `${API_URL}/ads`;

      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify(payload),
      });
      const data = await parseJsonSafe(res);

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Save failed");
      }

      setMessage(editingId ? "Ad updated" : "Ad created");
      resetForm();
      await loadAds();
    } catch (err) {
      setMessage(err.message || "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const deleteAd = async (ad) => {
    if (!window.confirm(`Delete "${ad.title}"?`)) return;

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(`${API_URL}/ads/${ad._id}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
        },
      });
      const data = await parseJsonSafe(res);

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Delete failed");
      }

      if (editingId === ad._id) resetForm();
      setMessage("Ad deleted");
      await loadAds();
    } catch (err) {
      setMessage(err.message || "Delete failed");
    } finally {
      setLoading(false);
    }
  };

  const toggleAd = async (ad) => {
    const next = {
      ...ad,
      startsAt: toDateInput(ad.startsAt),
      endsAt: toDateInput(ad.endsAt),
      isActive: !ad.isActive,
    };

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(`${API_URL}/ads/${ad._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify(next),
      });
      const data = await parseJsonSafe(res);

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Update failed");
      }

      setMessage(next.isActive ? "Ad enabled" : "Ad disabled");
      await loadAds();
    } catch (err) {
      setMessage(err.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const placementLabel = (value) =>
    PLACEMENTS.find((item) => item.value === value)?.label || value;

  const previewHtml = useMemo(() => buildPreviewHtml(form.html), [form.html]);

  return (
    <div className="adminAdsPage">
      <Navbar isScrolled={true} />

      <main className="adminAds">
        <header className="adminAds__header">
          <div>
            <span className="adminAds__eyebrow">Admin</span>
            <h1>Quan ly quang cao</h1>
            <p>Tao, sua, bat/tat va dat vi tri quang cao truc tiep tren web.</p>
          </div>

          <Link to="/admin/new-movie" className="adminAds__link">
            Admin movies
          </Link>
        </header>

        {message ? <div className="adminAds__message">{message}</div> : null}

        <section className="adminAds__layout">
          <form className="adminAds__form" onSubmit={saveAd}>
            <div className="adminAds__formHead">
              <h2>{editingId ? "Sua quang cao" : "Them quang cao"}</h2>
              {editingId ? (
                <button type="button" onClick={resetForm}>
                  Tao moi
                </button>
              ) : null}
            </div>

            <label>
              Ten quang cao
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="VD: Banner doi tac A"
                required
              />
            </label>

            <div className="adminAds__twoCols">
              <label>
                Vi tri hien thi
                <select
                  name="placement"
                  value={form.placement}
                  onChange={handleChange}
                >
                  {PLACEMENTS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Kieu quang cao
                <select name="format" value={form.format} onChange={handleChange}>
                  <option value="image">Image + link</option>
                  <option value="html">HTML / embed code</option>
                </select>
              </label>
            </div>

            {form.format === "image" ? (
              <>
                <label>
                  Image URL
                  <input
                    name="imageUrl"
                    value={form.imageUrl}
                    onChange={handleChange}
                    placeholder="https://..."
                  />
                </label>

                <label className="adminAds__upload">
                  <span>{uploading ? "Uploading..." : "Upload image"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => uploadImage(e.target.files?.[0])}
                  />
                </label>

                <label>
                  Link khi click
                  <input
                    name="targetUrl"
                    value={form.targetUrl}
                    onChange={handleChange}
                    placeholder="https://..."
                  />
                </label>

                <div className="adminAds__twoCols">
                  <label>
                    Alt text
                    <input
                      name="altText"
                      value={form.altText}
                      onChange={handleChange}
                    />
                  </label>

                  <label>
                    Nut CTA
                    <input
                      name="ctaLabel"
                      value={form.ctaLabel}
                      onChange={handleChange}
                      placeholder="Xem ngay"
                    />
                  </label>
                </div>
              </>
            ) : (
              <label>
                HTML / embed code
                <textarea
                  name="html"
                  value={form.html}
                  onChange={handleChange}
                  rows={9}
                  placeholder="<iframe ...></iframe> hoac ma quang cao"
                />
              </label>
            )}

            <div className="adminAds__threeCols">
              <label>
                Rong
                <input name="width" value={form.width} onChange={handleChange} />
              </label>

              <label>
                Cao
                <input
                  name="height"
                  type="number"
                  min="40"
                  max="720"
                  value={form.height}
                  onChange={handleChange}
                />
              </label>

              <label>
                Uu tien
                <input
                  name="priority"
                  type="number"
                  value={form.priority}
                  onChange={handleChange}
                />
              </label>
            </div>

            <div className="adminAds__twoCols">
              <label>
                Bat dau
                <input
                  name="startsAt"
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={handleChange}
                />
              </label>

              <label>
                Ket thuc
                <input
                  name="endsAt"
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={handleChange}
                />
              </label>
            </div>

            <div className="adminAds__checks">
              <label>
                <input
                  name="isActive"
                  type="checkbox"
                  checked={form.isActive}
                  onChange={handleChange}
                />
                Dang bat
              </label>

              <label>
                <input
                  name="openInNewTab"
                  type="checkbox"
                  checked={form.openInNewTab}
                  onChange={handleChange}
                />
                Mo link tab moi
              </label>
            </div>

            <label>
              Ghi chu noi bo
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={3}
              />
            </label>

            <div className="adminAds__preview">
              <div className="adminAds__previewHead">Preview</div>
              {form.format === "image" && form.imageUrl ? (
                <img src={form.imageUrl} alt={form.altText || form.title} />
              ) : form.format === "html" && form.html ? (
                <iframe
                  title="Ad preview"
                  srcDoc={previewHtml}
                  sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms"
                  style={{ height: `${form.height || 90}px` }}
                />
              ) : (
                <div className="adminAds__previewEmpty">Chua co noi dung</div>
              )}
            </div>

            <button className="adminAds__submit" type="submit" disabled={loading}>
              {loading ? "Dang luu..." : editingId ? "Luu thay doi" : "Tao quang cao"}
            </button>
          </form>

          <section className="adminAds__list">
            <div className="adminAds__listHead">
              <h2>Danh sach</h2>
              <button type="button" onClick={loadAds} disabled={loading}>
                Refresh
              </button>
            </div>

            {loading && ads.length === 0 ? (
              <div className="adminAds__empty">Dang tai...</div>
            ) : ads.length === 0 ? (
              <div className="adminAds__empty">Chua co quang cao nao</div>
            ) : (
              ads.map((ad) => (
                <article key={ad._id} className="adminAds__item">
                  <div className="adminAds__itemMain">
                    <div>
                      <h3>{ad.title}</h3>
                      <p>{placementLabel(ad.placement)}</p>
                    </div>
                    <span
                      className={`adminAds__status ${
                        ad.isActive ? "active" : "inactive"
                      }`}
                    >
                      {ad.isActive ? "ON" : "OFF"}
                    </span>
                  </div>

                  <div className="adminAds__itemMeta">
                    <span>{ad.format}</span>
                    <span>Priority {ad.priority || 0}</span>
                    <span>{ad.clicks || 0} clicks</span>
                  </div>

                  {ad.format === "image" && ad.imageUrl ? (
                    <img
                      className="adminAds__thumb"
                      src={ad.imageUrl}
                      alt={ad.altText || ad.title}
                    />
                  ) : null}

                  <div className="adminAds__itemActions">
                    <button type="button" onClick={() => editAd(ad)}>
                      Edit
                    </button>
                    <button type="button" onClick={() => toggleAd(ad)}>
                      {ad.isActive ? "Disable" : "Enable"}
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => deleteAd(ad)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))
            )}
          </section>
        </section>
      </main>
    </div>
  );
}
