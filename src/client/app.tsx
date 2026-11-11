import { useEffect, useState } from "react";
import { AudioGate } from "./components/audio-gate";
import { ToastProvider } from "./components/toast";
import { getSocket } from "./lib/socket";
import { HomeScreen } from "./screens/home-screen";

type Screen = "home" | "gate";

export function App() {
  const [connected, setConnected] = useState(() => getSocket().connected);
  const [screen, setScreen] = useState<Screen>("home");

  useEffect(() => {
    const socket = getSocket();
    const on = () => setConnected(true);
    const off = () => setConnected(false);
    socket.on("connect", on);
    socket.on("disconnect", off);
    return () => {
      socket.off("connect", on);
      socket.off("disconnect", off);
    };
  }, []);

  return (
    <ToastProvider>
      {screen === "home" ? (
        <HomeScreen
          connected={connected}
          onSolo={() => setScreen("gate")}
          onParty={() => setScreen("gate")}
          onLibrary={() => {}}
        />
      ) : (
        <AudioGate onBack={() => setScreen("home")} onDone={() => setScreen("home")} />
      )}
    </ToastProvider>
  );
}
