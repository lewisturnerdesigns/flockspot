export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestNotificationsPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) {
    return "denied";
  }

  return Notification.requestPermission();
}

export function showLocalNotification(title: string, body: string): void {
  if (!isNotificationSupported() || Notification.permission !== "granted") {
    return;
  }

  new Notification(title, { body });
}


let alertAudioContext: AudioContext | null = null;

function getAlertAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  if (!alertAudioContext) {
    const AudioContextClass = window.AudioContext ?? (
      window as typeof window & { webkitAudioContext?: typeof AudioContext }
    ).webkitAudioContext;

    if (!AudioContextClass) return null;
    alertAudioContext = new AudioContextClass();
  }

  return alertAudioContext;
}

export async function unlockAlertAudio(): Promise<void> {
  const context = getAlertAudioContext();
  if (!context) return;

  if (context.state === "suspended") {
    try {
      await context.resume();
    } catch {
      // Browser autoplay policy can still reject the resume.
    }
  }
}

export function playAlertSound(): void {
  const context = getAlertAudioContext();
  if (!context || context.state !== "running") return;

  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(880, now);
  oscillator.frequency.exponentialRampToValueAtTime(660, now + 0.12);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.18, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.23);
}
