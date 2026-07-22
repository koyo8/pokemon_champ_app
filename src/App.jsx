import {
  lazy,
  Suspense,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import "./index.css";

import { POKEMON_DATA, POKE_BY_ID } from "./data/pokemon";
import { Toast } from "./components/Toast";

import { RecordTab } from "./features/RecordTab";

const AnalysisTab = lazy(() =>
  import("./features/AnalysisTab").then(({ AnalysisTab: Component }) => ({
    default: Component,
  })),
);

const GAS_URL =
  "https://script.google.com/macros/s/AKfycbzW-esLy9C0hbmtBSIfQnQocKxMcq-0Ro3407mKF5jQ3N35nXznvQ-aMFX9v2hIg6fw/exec";

function sortOpponentStats(statsArray, sortTarget, sortOrder) {
  return [...statsArray].sort((a, b) => {
    if (sortTarget === "winRate") {
      if (a.pick === 0 && b.pick !== 0) return 1;
      if (b.pick === 0 && a.pick !== 0) return -1;
      if (a.pick === 0 && b.pick === 0) return b.encounter - a.encounter;
    }

    let difference = 0;
    if (sortTarget === "encounter") {
      difference = a.encounter - b.encounter || a.pickRate - b.pickRate;
    } else if (sortTarget === "pick") {
      difference = a.pickRate - b.pickRate || a.encounter - b.encounter;
    } else if (sortTarget === "lead") {
      difference = a.leadRate - b.leadRate || a.encounter - b.encounter;
    } else if (sortTarget === "winRate") {
      difference = a.winRate - b.winRate || a.encounter - b.encounter;
    }
    return sortOrder === "desc" ? -difference : difference;
  });
}

export default function App() {
  const [currentTab, setCurrentTab] = useState("record");

  const [analysisData, setAnalysisData] = useState(() => {
    const saved = localStorage.getItem("vgc_analysis_data");
    return saved ? JSON.parse(saved) : [];
  });

  const [myPartyIds, setMyPartyIds] = useState(() => {
    const saved = localStorage.getItem("my_vgc_party");
    return saved ? JSON.parse(saved) : [];
  });

  const [recordSeason, setRecordSeason] = useState(
    () => localStorage.getItem("vgc_season") || "",
  );
  const [isSeasonEditing, setIsSeasonEditing] = useState(false);
  const [isSeasonDropdownOpen, setIsSeasonDropdownOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [oppPickedIds, setOppPickedIds] = useState([]);
  const [myPickedIds, setMyPickedIds] = useState([]);
  const [matchResult, setMatchResult] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const [analysisSeason, setAnalysisSeason] = useState("すべて");

  // ★ 複数選択対応の初期状態
  const [selectedParties, setSelectedParties] = useState(() => {
    const latestRow = analysisData[analysisData.length - 1];
    if (latestRow?.[7]) {
      return [latestRow[7]];
    }
    return ["すべて"];
  });

  const [filterRange, setFilterRange] = useState("all");
  const [sortTarget, setSortTarget] = useState("encounter");
  const [sortOrder, setSortOrder] = useState("desc");
  const [aiResult, setAiResult] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isAiExpanded, setIsAiExpanded] = useState(true);
  const [aiError, setAiError] = useState("");

  const [isLoading, setIsLoading] = useState(
    () => !localStorage.getItem("vgc_analysis_data"),
  );
  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef(null);
  const isFirstLoad = useRef(true);
  const isFetchingRef = useRef(false);

  const [isPC, setIsPC] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 768 : false,
  );

  useEffect(() => {
    const handleResize = () => setIsPC(window.innerWidth >= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const showToast = useCallback((message, type = "error") => {
    setToast({ message, type });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchAnalysisData = useCallback(
    async (isManualReload = false) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      const hasCache = !!localStorage.getItem("vgc_analysis_data");
      if (!hasCache || isManualReload) setIsLoading(true);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      try {
        const response = await fetch(GAS_URL, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error(`通信エラー`);

        const rawRows = await response.json();
        const dataRows = rawRows.filter(
          (row) =>
            row &&
            row.join("").trim() !== "" &&
            row[0] !== "日時" &&
            row[4] !== "勝敗",
        );

        localStorage.setItem("vgc_analysis_data", JSON.stringify(dataRows));

        if (isFirstLoad.current && dataRows.length > 0) {
          isFirstLoad.current = false;
          const latestRow = dataRows[dataRows.length - 1];
          if (latestRow[7]) {
            // ★ 修正: 配列でセットするように変更
            setSelectedParties([latestRow[7]]);
            const names = latestRow[7].split(", ");
            const ids = names.map((name) => POKEMON_DATA[name]).filter(Boolean);
            if (ids.length === 6) {
              setMyPartyIds(ids);
              localStorage.setItem("my_vgc_party", JSON.stringify(ids));
            }
          }
          if (latestRow[8] && latestRow[8].trim() !== "") {
            setAnalysisSeason(latestRow[8]);
            setRecordSeason((prev) => {
              if (!prev) {
                localStorage.setItem("vgc_season", latestRow[8]);
                return latestRow[8];
              }
              return prev;
            });
          }
        }
        setAnalysisData(dataRows);
        if (isManualReload) showToast("データを最新化しました", "success");
      } catch (error) {
        clearTimeout(timeoutId);
        if (isManualReload || !hasCache) {
          showToast(
            error.name === "AbortError"
              ? "通信がタイムアウトしました"
              : "データの読み込みに失敗しました",
          );
        }
      } finally {
        setIsLoading(false);
        isFetchingRef.current = false;
      }
    },
    [showToast],
  );

  const syncOfflineData = useCallback(async () => {
    if (!navigator.onLine) return;
    const queue = JSON.parse(localStorage.getItem("vgc_offline_queue") || "[]");
    if (queue.length === 0) return;

    setIsSyncing(true);
    showToast(
      `通信が回復しました。未送信データ(${queue.length}件)を同期中...`,
      "info",
    );

    let successCount = 0;
    const failedQueue = [];

    for (const payload of queue) {
      try {
        const response = await fetch(GAS_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify(payload),
        });
        if (response.ok) successCount++;
        else failedQueue.push(payload);
      } catch {
        failedQueue.push(payload);
      }
    }

    localStorage.setItem("vgc_offline_queue", JSON.stringify(failedQueue));
    setIsSyncing(false);

    if (successCount > 0) {
      showToast(`${successCount}件のデータを自動送信しました！`, "success");
      fetchAnalysisData(true);
    }
  }, [fetchAnalysisData, showToast]);

  useEffect(() => {
    const initialSyncTimeout = window.setTimeout(() => {
      syncOfflineData();
    }, 0);
    window.addEventListener("online", syncOfflineData);
    return () => {
      window.clearTimeout(initialSyncTimeout);
      window.removeEventListener("online", syncOfflineData);
    };
  }, [syncOfflineData]);

  useEffect(() => {
    const initialFetchTimeout = window.setTimeout(() => {
      fetchAnalysisData();
    }, 0);
    return () => window.clearTimeout(initialFetchTimeout);
  }, [fetchAnalysisData]);

  const handleReload = useCallback(() => {
    syncOfflineData();
    fetchAnalysisData(true);
  }, [syncOfflineData, fetchAnalysisData]);

  const analysisRows = useMemo(
    () =>
      analysisData.map((row) => ({
        season: row[8],
        party: row[7],
        result: row[4],
        opp6: row[1] ? row[1].split(", ") : [],
        opp4: row[2] ? row[2].split(", ") : [],
        my4: row[3] ? row[3].split(", ") : [],
        myLead: row[5] ? row[5].split(", ") : [],
        oppLead: row[6] ? row[6].split(", ") : [],
      })),
    [analysisData],
  );

  const availableSeasons = useMemo(() => {
    const seasons = analysisRows
      .map((row) => row.season)
      .filter((s) => s && String(s).trim() !== "");
    return [...new Set(seasons.reverse())];
  }, [analysisRows]);

  const partyList = useMemo(() => {
    let filtered = analysisRows;
    if (analysisSeason !== "すべて")
      filtered = filtered.filter((row) => row.season === analysisSeason);

    const reversedParties = [...filtered]
      .reverse()
      .map((row) => row.party)
      .filter(Boolean);
    return ["すべて", ...new Set(reversedParties)];
  }, [analysisRows, analysisSeason]);

  const activeSelectedParties = useMemo(() => {
    const hasInvalid = selectedParties.some(
      (party) => party !== "すべて" && !partyList.includes(party),
    );
    return hasInvalid
      ? [partyList.length > 1 ? partyList[1] : "すべて"]
      : selectedParties;
  }, [partyList, selectedParties]);

  const analysisSeasonList = useMemo(
    () => ["すべて", ...availableSeasons],
    [availableSeasons],
  );
  const myPartyList = useMemo(
    () => myPartyIds.map((id) => POKE_BY_ID[id]).filter(Boolean),
    [myPartyIds],
  );

  const handleToggleOpp6 = useCallback(
    (id) => {
      setSelectedIds((prev) => {
        const isCurrentlySelected = prev.includes(id);
        if (isCurrentlySelected) {
          setOppPickedIds((pPrev) => pPrev.filter((pId) => pId !== id));
          return prev.filter((pId) => pId !== id);
        } else {
          if (prev.length >= 6) {
            showToast("選べるのは6匹までです");
            return prev;
          }
          setSearchText("");
          return [...prev, id];
        }
      });
    },
    [showToast],
  );

  const handleToggleOppPick = useCallback(
    (id) => {
      setOppPickedIds((prev) => {
        const isCurrentlySelected = prev.includes(id);
        if (isCurrentlySelected) {
          return prev.filter((i) => i !== id);
        } else {
          if (prev.length >= 4) {
            showToast("選出できるのは4匹までです");
            return prev;
          }
          return [...prev, id];
        }
      });
    },
    [showToast],
  );

  const handleToggleMyPick = useCallback(
    (id) => {
      setMyPickedIds((prev) => {
        const isCurrentlySelected = prev.includes(id);
        if (isCurrentlySelected) {
          return prev.filter((i) => i !== id);
        } else {
          if (prev.length >= 4) {
            showToast("選出できるのは4匹までです");
            return prev;
          }
          return [...prev, id];
        }
      });
    },
    [showToast],
  );

  const handleSort = useCallback((target) => {
    if (sortTarget === target)
      setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
    else {
      setSortTarget(target);
      setSortOrder("desc");
    }
  }, [sortTarget]);

  const handleSave = useCallback(async () => {
    if (selectedIds.length === 0)
      return showToast("相手のパーティを1匹以上選んでください");
    if (oppPickedIds.length < 2)
      return showToast("相手の選出を2匹以上選んでください");
    if (myPartyIds.length !== 6)
      return showToast("自分のパーティを6匹設定してください");
    if (myPickedIds.length !== 4)
      return showToast("自分の選出を4匹選んでください");
    if (!matchResult) return showToast("勝敗を選択してください");

    const payload = {
      opp_6: selectedIds.map((id) => POKE_BY_ID[id].name).join(", "),
      opp_4: oppPickedIds.map((id) => POKE_BY_ID[id].name).join(", "),
      opp_lead: oppPickedIds
        .slice(0, 2)
        .map((id) => POKE_BY_ID[id].name)
        .join(", "),
      my_4: myPickedIds.map((id) => POKE_BY_ID[id].name).join(", "),
      my_lead: myPickedIds
        .slice(0, 2)
        .map((id) => POKE_BY_ID[id].name)
        .join(", "),
      my_party: myPartyIds
        .map((id) => POKE_BY_ID[id].name)
        .sort()
        .join(", "),
      result: matchResult,
      season: recordSeason,
    };

    const resetUI = () => {
      setSearchText("");
      setSelectedIds([]);
      setOppPickedIds([]);
      setMyPickedIds([]);
      setMatchResult(null);
      localStorage.setItem("vgc_season", recordSeason);
    };

    if (!navigator.onLine) {
      const queue = JSON.parse(
        localStorage.getItem("vgc_offline_queue") || "[]",
      );
      queue.push(payload);
      localStorage.setItem("vgc_offline_queue", JSON.stringify(queue));
      showToast(
        "圏外のため端末内に一時保存しました。通信回復時に自動送信されます。",
        "info",
      );
      resetUI();
      return;
    }

    setIsSaving(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("通信エラー");
      clearTimeout(timeoutId);
      showToast("記録を保存しました", "success");
      resetUI();
      fetchAnalysisData();
    } catch {
      clearTimeout(timeoutId);
      const queue = JSON.parse(
        localStorage.getItem("vgc_offline_queue") || "[]",
      );
      queue.push(payload);
      localStorage.setItem("vgc_offline_queue", JSON.stringify(queue));
      showToast(
        "通信が不安定なため、端末内に一時保存しました。後で自動送信されます。",
        "info",
      );
      resetUI();
    } finally {
      setIsSaving(false);
    }
  }, [
    selectedIds,
    oppPickedIds,
    myPartyIds,
    myPickedIds,
    matchResult,
    recordSeason,
    showToast,
    fetchAnalysisData,
  ]);

  const recordSeasonRows = useMemo(
    () =>
      recordSeason
        ? analysisRows.filter((row) => row.season === recordSeason)
        : analysisRows,
    [analysisRows, recordSeason],
  );

  const globalSuggestedIds = useMemo(() => {
    const counts = new Map();
    recordSeasonRows.forEach(({ opp6 }) => {
      opp6.forEach((name) => counts.set(name, (counts.get(name) || 0) + 1));
    });

    return [...counts.entries()]
      .sort(([, countA], [, countB]) => countB - countA)
      .map(([name]) => POKEMON_DATA[name])
      .filter(Boolean);
  }, [recordSeasonRows]);

  const suggestedIds = useMemo(() => {
    const displayLimit = isPC ? 24 : 15;
    if (selectedIds.length === 0) {
      return { suggested: globalSuggestedIds.slice(0, displayLimit) };
    }

    const selectedNames = selectedIds
      .map((id) => POKE_BY_ID[id]?.name)
      .filter(Boolean);
    const selectedNameSet = new Set(selectedNames);
    const coCounts = new Map();

    recordSeasonRows.forEach(({ opp6 }) => {
      const opponentSet = new Set(opp6);
      if (selectedNames.every((name) => opponentSet.has(name))) {
        opp6.forEach((name) => {
          if (!selectedNameSet.has(name)) {
            coCounts.set(name, (coCounts.get(name) || 0) + 1);
          }
        });
      }
    });

    const coSuggestedIds = [...coCounts.entries()]
      .sort(([, countA], [, countB]) => countB - countA)
      .map(([name]) => POKEMON_DATA[name])
      .filter(Boolean);
    const selectedIdSet = new Set(selectedIds);
    const coSuggestedIdSet = new Set(coSuggestedIds);
    const fallbackIds = globalSuggestedIds.filter(
      (id) => !selectedIdSet.has(id) && !coSuggestedIdSet.has(id),
    );

    return {
      suggested: [...coSuggestedIds, ...fallbackIds].slice(0, displayLimit),
    };
  }, [selectedIds, recordSeasonRows, globalSuggestedIds, isPC]);

  const baseStats = useMemo(() => {
    let filteredData = analysisRows;

    // ★ 修正: 複数選択の合算処理（バグ修正済）
    if (
      !activeSelectedParties.includes("すべて") &&
      activeSelectedParties.length > 0
    ) {
      filteredData = filteredData.filter((row) =>
        activeSelectedParties.includes(row.party),
      );
    }

    if (analysisSeason !== "すべて")
      filteredData = filteredData.filter((row) => row.season === analysisSeason);

    const targetData =
      filterRange === "recent10" ? filteredData.slice(-10) : filteredData;

    const totalMatches = targetData.length;
    let winCount = 0;
    let currentWins = 0;
    const trendData = [];

    const oppStats = {},
      myPickCounts = {},
      oppLeadPairs = {},
      myLeadPairs = {};

    targetData.forEach((row, index) => {
      const isWin = row.result === "勝ち";
      if (isWin) {
        winCount += 1;
        currentWins += 1;
      }
      trendData.push({
        match: index + 1,
        winRate: parseFloat(((currentWins / (index + 1)) * 100).toFixed(1)),
      });

      const { opp6, opp4, my4, oppLead, myLead } = row;
      const opp4Set = new Set(opp4);
      const oppLeadSet = new Set(oppLead);
      const myLeadSet = new Set(myLead);
      const hasLeadData = oppLead.some((name) => name.trim() !== "");
      const myBack = my4.filter((poke) => !myLeadSet.has(poke));

      opp6.forEach((poke) => {
        if (!oppStats[poke])
          oppStats[poke] = {
            name: poke,
            encounter: 0,
            pick: 0,
            lead: 0,
            validLeadMatch: 0,
            pickWin: 0,
          };
        oppStats[poke].encounter += 1;
        if (opp4Set.has(poke)) {
          oppStats[poke].pick += 1;
          if (isWin) oppStats[poke].pickWin += 1;
        }
        if (hasLeadData) {
          oppStats[poke].validLeadMatch += 1;
          if (oppLeadSet.has(poke)) oppStats[poke].lead += 1;
        }
      });

      my4.forEach((poke) => {
        myPickCounts[poke] = (myPickCounts[poke] || 0) + 1;
      });

      if (oppLead.length === 2) {
        const normalizedLead = [...oppLead].sort();
        const pair = normalizedLead.join(" + ");
        if (!oppLeadPairs[pair])
          oppLeadPairs[pair] = { pokes: normalizedLead, count: 0, win: 0 };
        oppLeadPairs[pair].count += 1;
        if (isWin) oppLeadPairs[pair].win += 1;
      }
      if (myLead.length === 2) {
        const normalizedLead = [...myLead].sort();
        const pair = normalizedLead.join(" + ");
        if (!myLeadPairs[pair])
          myLeadPairs[pair] = {
            pokes: normalizedLead,
            count: 0,
            win: 0,
            backs: {},
          };
        myLeadPairs[pair].count += 1;
        if (isWin) myLeadPairs[pair].win += 1;
        if (myBack.length === 2) {
          const bPair = [...myBack].sort().join(" + ");
          if (!myLeadPairs[pair].backs[bPair])
            myLeadPairs[pair].backs[bPair] = { count: 0, win: 0 };
          myLeadPairs[pair].backs[bPair].count += 1;
          if (isWin) myLeadPairs[pair].backs[bPair].win += 1;
        }
      }
    });

    const statsArray = Object.values(oppStats).map((s) => ({
      name: s.name,
      id: POKEMON_DATA[s.name] || 0,
      encounter: s.encounter,
      pickRate: s.encounter > 0 ? (s.pick / s.encounter) * 100 : 0,
      leadRate: s.validLeadMatch > 0 ? (s.lead / s.validLeadMatch) * 100 : 0,
      winRate: s.pick > 0 ? (s.pickWin / s.pick) * 100 : 0,
      pick: s.pick,
    }));

    const myStatsArray = Object.entries(myPickCounts)
      .map(([name, count]) => ({ name, count, id: POKEMON_DATA[name] || 0 }))
      .sort((a, b) => b.count - a.count);
    const oppLeadPairStats = Object.values(oppLeadPairs)
      .map((s) => ({ ...s, winRate: (s.win / s.count) * 100 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    const myLeadPairStats = Object.values(myLeadPairs)
      .map((s) => {
        const bestBacks = Object.entries(s.backs)
          .map(([name, b]) => ({
            name,
            pokes: name.split(" + "),
            count: b.count,
            winRate: (b.win / b.count) * 100,
          }))
          .sort((a, b) => b.count - a.count);
        return { ...s, winRate: (s.win / s.count) * 100, bestBacks };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const winRate =
      totalMatches > 0 ? ((winCount / totalMatches) * 100).toFixed(1) : 0;

    return {
      totalMatches,
      winCount,
      winRate,
      trendData,
      statsArray,
      myStatsArray,
      oppLeadPairStats,
      myLeadPairStats,
    };
  }, [
    analysisRows,
    activeSelectedParties,
    analysisSeason,
    filterRange,
  ]);

  const sortedStatsArray = useMemo(
    () => sortOpponentStats(baseStats.statsArray, sortTarget, sortOrder),
    [baseStats.statsArray, sortTarget, sortOrder],
  );

  const stats = useMemo(
    () => ({ ...baseStats, statsArray: sortedStatsArray }),
    [baseStats, sortedStatsArray],
  );

  const handleAIAnalysis = useCallback(async () => {
    if (stats.totalMatches === 0) {
      setAiError("対戦データがありません");
      return;
    }
    setIsAiLoading(true);
    setAiResult("");
    setAiError("");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const compactStats = {
      totalMatches: stats.totalMatches,
      winRate: stats.winRate,
      oppStats: stats.statsArray
        .slice(0, 10)
        .map(
          (s) => `${s.name}: 遭遇${s.encounter}回 勝率${s.winRate.toFixed(0)}%`,
        ),
      myLeadPairs: stats.myLeadPairStats.map(
        (s) =>
          `${s.pokes.join("+")}: 選出${s.count}回 勝率${s.winRate.toFixed(0)}%`,
      ),
    };

    try {
      const response = await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          action: "analyze",
          stats_json: JSON.stringify(compactStats),
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await response.json();
      if (data.error) setAiError(data.error);
      else {
        setAiResult(data.result);
        setIsAiExpanded(true);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      setAiError(
        error.name === "AbortError"
          ? "🚨 AIの分析がタイムアウトしました"
          : "🚨 エラー詳細: " + error.message,
      );
    } finally {
      setIsAiLoading(false);
    }
  }, [stats]);

  return (
    <div>
      <div className="sticky-top">
        <div className="header-container">
          <img src="/logo.png" alt="Logo" className="app-logo" />
          <div className="title-wrapper">
            <h1 className="app-title">
              <span className="title-log">Log</span>
              <span className="title-de">De</span>
              <span className="title-x">x</span>
            </h1>
            <div className="app-subtitle">Pokémon Champions</div>
          </div>
          <button
            className="reload-btn"
            onClick={handleReload}
            disabled={isSyncing}
            aria-label="ページを再読み込み"
          >
            <svg
              viewBox="0 0 24 24"
              width="24"
              height="24"
              fill="currentColor"
              style={{
                animation: isSyncing ? "spin 1s linear infinite" : "none",
              }}
            >
              <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
            </svg>
          </button>
        </div>
        <div
          className="tab-container"
          role="tablist"
          aria-label="メインメニュー"
        >
          <button
            className={`tab-btn ${currentTab === "record" ? "active" : ""}`}
            onClick={() => setCurrentTab("record")}
            role="tab"
            aria-selected={currentTab === "record"}
          >
            記録
          </button>
          <button
            className={`tab-btn ${currentTab === "analysis" ? "active" : ""}`}
            onClick={() => setCurrentTab("analysis")}
            role="tab"
            aria-selected={currentTab === "analysis"}
          >
            分析
          </button>
        </div>
      </div>

      <div className="content-area">
        {currentTab === "record" ? (
          <RecordTab
            recordSeason={recordSeason}
            setRecordSeason={setRecordSeason}
            isSeasonEditing={isSeasonEditing}
            setIsSeasonEditing={setIsSeasonEditing}
            isSeasonDropdownOpen={isSeasonDropdownOpen}
            setIsSeasonDropdownOpen={setIsSeasonDropdownOpen}
            availableSeasons={availableSeasons}
            selectedIds={selectedIds}
            handleToggleOpp6={handleToggleOpp6}
            searchText={searchText}
            setSearchText={setSearchText}
            suggestedIds={suggestedIds}
            oppPickedIds={oppPickedIds}
            handleToggleOppPick={handleToggleOppPick}
            isLoading={isLoading}
            myPartyIds={myPartyIds}
            setMyPartyIds={setMyPartyIds}
            myPartyList={myPartyList}
            myPickedIds={myPickedIds}
            handleToggleMyPick={handleToggleMyPick}
            setMyPickedIds={setMyPickedIds}
            matchResult={matchResult}
            setMatchResult={setMatchResult}
            handleSave={handleSave}
            isSaving={isSaving || isSyncing}
            showToast={showToast}
          />
        ) : (
          <Suspense fallback={<div className="loading">データを読み込み中...</div>}>
            <AnalysisTab
              isLoading={isLoading}
              stats={stats}
              selectedParties={activeSelectedParties} /* ★ 修正: 複数形に統一 */
              setSelectedParties={setSelectedParties} /* ★ 修正: 複数形に統一 */
              partyList={partyList}
              analysisSeason={analysisSeason}
              setAnalysisSeason={setAnalysisSeason}
              analysisSeasonList={analysisSeasonList}
              filterRange={filterRange}
              setFilterRange={setFilterRange}
              sortTarget={sortTarget}
              handleSort={handleSort}
              sortOrder={sortOrder}
              handleAIAnalysis={handleAIAnalysis}
              isAiLoading={isAiLoading}
              aiError={aiError}
              aiResult={aiResult}
              isAiExpanded={isAiExpanded}
              setIsAiExpanded={setIsAiExpanded}
            />
          </Suspense>
        )}
      </div>
      <Toast toast={toast} />
    </div>
  );
}
