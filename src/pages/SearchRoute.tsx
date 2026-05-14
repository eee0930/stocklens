import SearchPage from '../components/SearchPage'
import { useSearchNavigator } from '../hooks/useSearchNavigator'

export default function SearchRoute() {
  const handleSearch = useSearchNavigator()
  return <SearchPage onSearch={handleSearch} />
}
