import { Route, Routes } from "react-router";
import { Layout } from "./components/layout/Layout";
import { MatchPage } from "./pages/MatchPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PlayerPage } from "./pages/PlayerPage";
import { SquadPage } from "./pages/SquadPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<SquadPage />} />
        <Route path="player/:name" element={<PlayerPage />} />
        <Route path="match/:id" element={<MatchPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
