import { Routes, Route } from 'react-router-dom'
import SearchRoute from './pages/SearchRoute'
import StockRoute from './pages/StockRoute'
import RecommendRoute from './pages/RecommendRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/"              element={<SearchRoute />} />
      <Route path="/stock/:symbol" element={<StockRoute />} />
      <Route path="/recommend"     element={<RecommendRoute />} />
    </Routes>
  )
}
