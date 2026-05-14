import { Routes, Route } from 'react-router-dom'
import SearchRoute from './pages/SearchRoute'
import StockRoute from './pages/StockRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/"              element={<SearchRoute />} />
      <Route path="/stock/:symbol" element={<StockRoute />} />
    </Routes>
  )
}
