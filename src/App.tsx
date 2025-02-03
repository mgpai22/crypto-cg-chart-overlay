import React, { useEffect, useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Coins, Search, Sun, Moon } from "lucide-react";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface Coin {
  id: string;
  name: string;
  symbol: string;
  thumb: string;
  market_cap_rank: number;
}

interface CoinData {
  id: string;
  name: string;
  prices: number[];
  color: string;
  customColor?: string;
}

// Helper debounce function
function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): T {
  let timeout: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

function App() {
  // Dark mode state and toggle
  const [darkMode, setDarkMode] = useState(false);
  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const newMode = !prev;
      if (newMode) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      return newMode;
    });
  };

  const [searchTerm1, setSearchTerm1] = useState("");
  const [searchTerm2, setSearchTerm2] = useState("");
  const [searchResults1, setSearchResults1] = useState<Coin[]>([]);
  const [searchResults2, setSearchResults2] = useState<Coin[]>([]);
  const [selectedCoin1, setSelectedCoin1] = useState<Coin | null>(null);
  const [selectedCoin2, setSelectedCoin2] = useState<Coin | null>(null);
  const [chartData, setChartData] = useState<{
    coin1: CoinData | null;
    coin2: CoinData | null;
  }>({
    coin1: null,
    coin2: null,
  });
  const [labels, setLabels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchCoins = async (
    term: string,
    setResults: (results: Coin[]) => void
  ) => {
    if (term.length < 2) {
      setResults([]);
      return;
    }

    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(
          term
        )}`
      );
      const data = await response.json();
      setResults(data.coins.slice(0, 5));
    } catch (err) {
      console.error("Search failed:", err);
    }
  };

  const fetchPriceData = async (coin1: Coin | null, coin2: Coin | null) => {
    if (!coin1 || !coin2) return;

    try {
      setIsLoading(true);
      setError(null);

      const now = Math.floor(Date.now() / 1000);
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60;

      const [response1, response2] = await Promise.all([
        fetch(
          `https://api.coingecko.com/api/v3/coins/${coin1.id}/market_chart/range?vs_currency=usd&from=${thirtyDaysAgo}&to=${now}`
        ),
        fetch(
          `https://api.coingecko.com/api/v3/coins/${coin2.id}/market_chart/range?vs_currency=usd&from=${thirtyDaysAgo}&to=${now}`
        ),
      ]);

      const data1 = await response1.json();
      const data2 = await response2.json();

      const dateLabels = data1.prices.map((item: [number, number]) =>
        new Date(item[0]).toLocaleDateString()
      );

      setChartData({
        coin1: {
          id: coin1.id,
          name: coin1.name,
          prices: data1.prices.map((item: [number, number]) => item[1]),
          color: "rgb(54, 162, 235)",
        },
        coin2: {
          id: coin2.id,
          name: coin2.name,
          prices: data2.prices.map((item: [number, number]) => item[1]),
          color: "rgb(255, 99, 132)",
        },
      });
      setLabels(dateLabels);
    } catch (err) {
      setError("Failed to fetch cryptocurrency data. Please try again later.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      searchCoins(searchTerm1, setSearchResults1);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm1]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      searchCoins(searchTerm2, setSearchResults2);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm2]);

  useEffect(() => {
    if (selectedCoin1 && selectedCoin2) {
      fetchPriceData(selectedCoin1, selectedCoin2);
    }
  }, [selectedCoin1, selectedCoin2]);

  // Debounced functions to update coin colors
  const updateCoin1Color = useMemo(
    () =>
      debounce((color: string) => {
        setChartData((prev) => ({
          ...prev,
          coin1: prev.coin1 ? { ...prev.coin1, color } : null,
        }));
      }, 100),
    []
  );

  const updateCoin2Color = useMemo(
    () =>
      debounce((color: string) => {
        setChartData((prev) => ({
          ...prev,
          coin2: prev.coin2 ? { ...prev.coin2, color } : null,
        }));
      }, 100),
    []
  );

  const data = {
    labels,
    datasets: [
      chartData.coin1 && {
        label: `${chartData.coin1.name} (USD)`,
        data: chartData.coin1.prices,
        borderColor: chartData.coin1.color,
        backgroundColor: `${chartData.coin1.color}80`,
        yAxisID: "y",
      },
      chartData.coin2 && {
        label: `${chartData.coin2.name} (USD)`,
        data: chartData.coin2.prices,
        borderColor: chartData.coin2.color,
        backgroundColor: `${chartData.coin2.color}80`,
        yAxisID: "y1",
      },
    ].filter((dataset): dataset is NonNullable<typeof dataset> =>
      Boolean(dataset)
    ),
  };

  const options = {
    responsive: true,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    stacked: false,
    plugins: {
      title: {
        display: true,
        text:
          chartData.coin1 && chartData.coin2
            ? `${chartData.coin1.name} vs ${chartData.coin2.name} Price Comparison (30 Days)`
            : "Select two cryptocurrencies to compare",
      },
    },
    scales: {
      y: {
        type: "linear" as const,
        display: true,
        position: "left" as const,
        title: {
          display: true,
          text: chartData.coin1 ? `${chartData.coin1.name} Price (USD)` : "",
        },
      },
      y1: {
        type: "linear" as const,
        display: true,
        position: "right" as const,
        title: {
          display: true,
          text: chartData.coin2 ? `${chartData.coin2.name} Price (USD)` : "",
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Coins className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                Cryptocurrency Price Comparison
              </h1>
            </div>
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-md border border-gray-300 dark:border-gray-600 focus:outline-none"
              title="Toggle Dark Mode"
            >
              {darkMode ? (
                <Sun className="w-6 h-6 text-yellow-500" />
              ) : (
                <Moon className="w-6 h-6 text-gray-800 dark:text-gray-100" />
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* First Coin Search */}
            <div className="relative">
              <div className="flex items-center gap-2 p-2 border rounded-lg dark:border-gray-600 bg-transparent">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm1}
                  onChange={(e) => setSearchTerm1(e.target.value)}
                  placeholder="Search first cryptocurrency..."
                  className="w-full outline-none bg-transparent text-gray-800 dark:text-gray-100"
                />
                <input
                  type="color"
                  defaultValue="#36a2eb"
                  onChange={(e) => updateCoin1Color(e.target.value)}
                  className="w-8 h-8 cursor-pointer"
                />
              </div>
              {searchResults1.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-lg shadow-lg">
                  {searchResults1.map((coin) => (
                    <div
                      key={coin.id}
                      className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                      onClick={() => {
                        setSelectedCoin1(coin);
                        setSearchTerm1("");
                        setSearchResults1([]);
                      }}
                    >
                      <img
                        src={coin.thumb}
                        alt={coin.name}
                        className="w-6 h-6"
                      />
                      <span className="text-gray-800 dark:text-gray-100">
                        {coin.name}
                      </span>
                      <span className="text-gray-500 text-sm">
                        ({coin.symbol.toUpperCase()})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Second Coin Search */}
            <div className="relative">
              <div className="flex items-center gap-2 p-2 border rounded-lg dark:border-gray-600 bg-transparent">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm2}
                  onChange={(e) => setSearchTerm2(e.target.value)}
                  placeholder="Search second cryptocurrency..."
                  className="w-full outline-none bg-transparent text-gray-800 dark:text-gray-100"
                />
                <input
                  type="color"
                  defaultValue="#ff6384"
                  onChange={(e) => updateCoin2Color(e.target.value)}
                  className="w-8 h-8 cursor-pointer"
                />
              </div>
              {searchResults2.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-lg shadow-lg">
                  {searchResults2.map((coin) => (
                    <div
                      key={coin.id}
                      className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                      onClick={() => {
                        setSelectedCoin2(coin);
                        setSearchTerm2("");
                        setSearchResults2([]);
                      }}
                    >
                      <img
                        src={coin.thumb}
                        alt={coin.name}
                        className="w-6 h-6"
                      />
                      <span className="text-gray-800 dark:text-gray-100">
                        {coin.name}
                      </span>
                      <span className="text-gray-500 text-sm">
                        ({coin.symbol.toUpperCase()})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Selected Coins Display */}
          <div className="flex flex-wrap gap-4 mb-6">
            {selectedCoin1 && (
              <div
                className="flex items-center gap-2 p-2 rounded-lg"
                style={{ backgroundColor: `${chartData.coin1?.color}20` }}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: chartData.coin1?.color }}
                ></div>
                <img
                  src={selectedCoin1.thumb}
                  alt={selectedCoin1.name}
                  className="w-6 h-6"
                />
                <span className="text-gray-800 dark:text-gray-100">
                  {selectedCoin1.name}
                </span>
                <button
                  onClick={() => setSelectedCoin1(null)}
                  className="text-red-500 hover:text-red-700 focus:outline-none"
                >
                  ×
                </button>
              </div>
            )}
            {selectedCoin2 && (
              <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-gray-700 rounded-lg">
                <img
                  src={selectedCoin2.thumb}
                  alt={selectedCoin2.name}
                  className="w-6 h-6"
                />
                <span className="text-gray-800 dark:text-gray-100">
                  {selectedCoin2.name}
                </span>
                <button
                  onClick={() => setSelectedCoin2(null)}
                  className="text-red-500 hover:text-red-700 focus:outline-none"
                >
                  ×
                </button>
              </div>
            )}
          </div>

          {isLoading && (
            <div className="flex justify-center items-center h-[400px]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          )}

          {error && (
            <div className="text-red-500 text-center p-4 bg-red-50 dark:bg-red-800 rounded-lg">
              {error}
            </div>
          )}

          {!isLoading && !error && chartData.coin1 && chartData.coin2 && (
            <div className="h-[600px]">
              <Line options={options} data={data} />
            </div>
          )}

          <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
            <p>
              Data provided by CoinGecko API. Last 30 days of price history.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
