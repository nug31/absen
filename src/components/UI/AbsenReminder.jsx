import React, { useState, useEffect, useCallback } from 'react';

// Batas waktu absen: 06:45
const DEADLINE_HOUR = 6;
const DEADLINE_MIN = 45;

// Pengingat akan muncul mulai jam 06:00 sampai deadline
const WARN_START_HOUR = 6;
const WARN_START_MIN = 0;

function getMinutesLeft() {
  const now = new Date();
  const deadline = new Date(now);
  deadline.setHours(DEADLINE_HOUR, DEADLINE_MIN, 0, 0);
  return Math.floor((deadline - now) / 60000);
}

function formatCountdown(minutesLeft) {
  if (minutesLeft <= 0) return '00:00';
  const m = Math.floor(minutesLeft);
  const s = Math.round(((minutesLeft % 1) * 60));
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getSecondCountdown() {
  const now = new Date();
  const deadline = new Date(now);
  deadline.setHours(DEADLINE_HOUR, DEADLINE_MIN, 0, 0);
  const diffSec = Math.max(0, Math.floor((deadline - now) / 1000));
  const m = Math.floor(diffSec / 60);
  const s = diffSec % 60;
  return { total: diffSec, text: `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` };
}

function isInWarningWindow() {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const nowMin = h * 60 + m;
  const startMin = WARN_START_HOUR * 60 + WARN_START_MIN;
  const endMin = DEADLINE_HOUR * 60 + DEADLINE_MIN;
  return nowMin >= startMin && nowMin < endMin;
}

function isAfterDeadline() {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  return h * 60 + m >= DEADLINE_HOUR * 60 + DEADLINE_MIN;
}

export default function AbsenReminder({ alreadyCheckedIn = false }) {
  const [countdown, setCountdown] = useState(getSecondCountdown());
  const [notifGranted, setNotifGranted] = useState(false);
  const [notifSent, setNotifSent] = useState({ t30: false, t10: false, t0: false });
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);

  // Cek apakah perlu tampil
  useEffect(() => {
    const check = () => {
      if (alreadyCheckedIn) { setVisible(false); return; }
      if (isInWarningWindow() || isAfterDeadline()) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };
    check();
    const id = setInterval(check, 10000);
    return () => clearInterval(id);
  }, [alreadyCheckedIn]);

  // Countdown setiap detik
  useEffect(() => {
    const id = setInterval(() => {
      setCountdown(getSecondCountdown());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Minta izin notifikasi browser
  const requestNotifPermission = useCallback(async () => {
    if (!('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    setNotifGranted(perm === 'granted');
    if (perm === 'granted') {
      new Notification('🔔 Pengingat Absen', {
        body: 'Notifikasi pengingat absen diaktifkan! Kami akan mengingatkan Anda sebelum jam 06:45.',
        icon: '/favicon.ico',
        tag: 'absen-reminder-init',
      });
    }
  }, []);

  // Cek permission saat mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      setNotifGranted(true);
    }
  }, []);

  // Kirim notifikasi otomatis di H-30 menit, H-10 menit, dan tepat deadline
  useEffect(() => {
    if (!notifGranted) return;
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const nowMin = h * 60 + m;
    const deadlineMin = DEADLINE_HOUR * 60 + DEADLINE_MIN;

    if (!notifSent.t30 && nowMin === deadlineMin - 30) {
      new Notification('⏰ Ingat Absen!', {
        body: 'Sisa 30 menit lagi untuk absen. Batas absen jam 06:45!',
        icon: '/favicon.ico',
        tag: 'absen-30',
        requireInteraction: true,
      });
      setNotifSent(s => ({ ...s, t30: true }));
    }
    if (!notifSent.t10 && nowMin === deadlineMin - 10) {
      new Notification('🚨 Hampir Terlambat!', {
        body: 'Sisa 10 menit lagi! Segera absen sebelum jam 06:45!',
        icon: '/favicon.ico',
        tag: 'absen-10',
        requireInteraction: true,
      });
      setNotifSent(s => ({ ...s, t10: true }));
    }
    if (!notifSent.t0 && nowMin === deadlineMin) {
      new Notification('❌ Batas Absen Habis!', {
        body: 'Batas waktu absen (06:45) sudah lewat!',
        icon: '/favicon.ico',
        tag: 'absen-0',
        requireInteraction: true,
      });
      setNotifSent(s => ({ ...s, t0: true }));
    }
  }, [countdown, notifGranted, notifSent]);

  if (!visible || (dismissed && !isAfterDeadline())) return null;
  if (alreadyCheckedIn) return null;

  const isOver = isAfterDeadline();
  const isCritical = !isOver && countdown.total <= 10 * 60; // < 10 menit = merah
  const isWarning = !isOver && countdown.total <= 30 * 60;  // < 30 menit = kuning

  let bannerClass = 'absen-reminder';
  if (isOver) bannerClass += ' absen-reminder--over';
  else if (isCritical) bannerClass += ' absen-reminder--critical';
  else if (isWarning) bannerClass += ' absen-reminder--warning';
  else bannerClass += ' absen-reminder--info';

  return (
    <div className={bannerClass} role="alert">
      <div className="absen-reminder__icon">
        {isOver ? '❌' : isCritical ? '🚨' : isWarning ? '⚠️' : '🔔'}
      </div>
      <div className="absen-reminder__body">
        {isOver ? (
          <>
            <div className="absen-reminder__title">Batas Absen Sudah Lewat</div>
            <div className="absen-reminder__sub">Batas waktu absen (06:45) sudah berakhir.</div>
          </>
        ) : (
          <>
            <div className="absen-reminder__title">
              {isCritical ? 'Segera Absen!' : 'Ingat Absen!'}
            </div>
            <div className="absen-reminder__sub">
              Batas absen <strong>06:45</strong> — sisa waktu:
            </div>
            <div className="absen-reminder__countdown">{countdown.text}</div>
          </>
        )}

        {!notifGranted && 'Notification' in window && (
          <button className="absen-reminder__notif-btn" onClick={requestNotifPermission}>
            🔔 Aktifkan notifikasi
          </button>
        )}
      </div>

      {!isOver && (
        <button
          className="absen-reminder__close"
          onClick={() => setDismissed(true)}
          aria-label="Tutup pengingat"
        >
          ✕
        </button>
      )}
    </div>
  );
}
