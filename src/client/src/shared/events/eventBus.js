const observers = new Map();

export function subscribe(eventName, observer) {
  if (!observers.has(eventName)) {
    observers.set(eventName, new Set());
  }

  observers.get(eventName).add(observer);

  return () => observers.get(eventName)?.delete(observer);
}

export function publish(eventName, data) {
  for (const observer of observers.get(eventName) ?? []) {
    try {
      observer(data);
    } catch (error) {
      console.error(`Observer failed for ${eventName}:`, error);
    }
  }
}
