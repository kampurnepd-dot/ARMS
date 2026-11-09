import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";

const Ctx = createContext(null);

export function SocketProvider({ children }) {
  const socket = useMemo(
    () => io("http://localhost:1111", { withCredentials: true, autoConnect: false }),
    []
  );
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const on = () => setConnected(true);
    const off = () => setConnected(false);
    socket.on("connect", on);
    socket.on("disconnect", off);
    socket.connect();
    return () => {
      socket.off("connect", on);
      socket.off("disconnect", off);
      socket.disconnect();
    };
  }, [socket]);

  return <Ctx.Provider value={{ socket, connected }}>{children}</Ctx.Provider>;
}

export const useSocket = () => useContext(Ctx);

// Joins flight:<scheduleId> and calls onSeatUpdate({ schedule_id, seats }) on every "seat-update".
export function useFlightRoom(scheduleId, onSeatUpdate) {
  const { socket } = useSocket();
  const handler = useRef(onSeatUpdate);
  handler.current = onSeatUpdate;

  useEffect(() => {
    if (!scheduleId) return;
    const join = () => socket.emit("join-flight", scheduleId);
    const update = (p) => {
      if (Number(p.schedule_id) === Number(scheduleId)) handler.current(p);
    };
    if (socket.connected) join();
    socket.on("connect", join); // re-join after a reconnect
    socket.on("seat-update", update);
    return () => {
      socket.emit("leave-flight", scheduleId);
      socket.off("connect", join);
      socket.off("seat-update", update);
    };
  }, [socket, scheduleId]);
}
