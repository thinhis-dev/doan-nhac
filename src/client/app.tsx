import { useEffect, useState } from "react";
import { io } from "socket.io-client";

export function App() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io({ transports: ["websocket", "polling"] });
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    return () => {
      socket.close();
    };
  }, []);

  return (
    <main>
      <h1>Đoán Nhạc</h1>
      <p>{connected ? "Đã kết nối" : "Đang đánh thức máy chủ..."}</p>
    </main>
  );
}
