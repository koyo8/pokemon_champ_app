import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import "./index.css";

import { POKEMON_DATA, fullPokeList, POKE_BY_ID } from "./data/pokemon";
import { Toast } from "./components/Toast";

import { RecordTab } from "./features/RecordTab";
import { AnalysisTab } from "./features/AnalysisTab";

const GAS_URL =
  "https://script.google.com/macros/s/AKfycbzW-esLy9C0hbmtBSIfQnQocKxMcq-0Ro3407mKF5jQ3N35nXznvQ-aMFX9v2hIg6fw/exec";

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
  const [selectedParty, setSelectedParty] = useState("すべて");
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

  // ★ 追加: PC画面かどうかを判定するステート（768px以上ならtrue）
  const [isPC, setIsPC] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 768 : false,
  );

  // ★ 追加: ウィンドウサイズが変わった時にPC/スマホ判定を更新する
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
      } catch (error) {
        failedQueue.push(payload);
      }
    }

    localStorage.setItem("vgc_offline_queue", JSON.stringify(failedQueue));
    setIsSyncing(false);

    if (successCount > 0) {
      showToast(`${successCount}件のデータを自動送信しました！`, "success");
      fetchAnalysisData(true);
    }
  }, [showToast]);

  useEffect(() => {
    syncOfflineData();
    window.addEventListener("online", syncOfflineData);
    return () => window.removeEventListener("online", syncOfflineData);
  }, [syncOfflineData]);

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
            setSelectedParty(latestRow[7]);
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

  useEffect(() => {
    fetchAnalysisData();
  }, [fetchAnalysisData]);

  const handleReload = useCallback(() => {
    syncOfflineData();
    fetchAnalysisData(true);
  }, [syncOfflineData, fetchAnalysisData]);

  const availableSeasons = useMemo(() => {
    const seasons = analysisData
      .map((row) => row[8])
      .filter((s) => s && String(s).trim() !== "");
    return [...new Set(seasons.reverse())];
  }, [analysisData]);

  const partyList = useMemo(() => {
    let filtered = analysisData;
    if (analysisSeason !== "すべて")
      filtered = filtered.filter((row) => row[8] === analysisSeason);
    return [
      "すべて",
      ...new Set(filtered.map((row) => row[7]).filter(Boolean)),
    ];
  }, [analysisData, analysisSeason]);

  useEffect(() => {
    if (selectedParty !== "すべて" && !partyList.includes(selectedParty))
      setSelectedParty("すべて");
  }, [partyList, selectedParty]);

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

  const handleSort = (target) => {
    if (sortTarget === target)
      setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
    else {
      setSortTarget(target);
      setSortOrder("desc");
    }
  };

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
      await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      showToast("記録を保存しました", "success");
      resetUI();
      fetchAnalysisData();
    } catch (error) {
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

  const suggestedIds = useMemo(() => {
    const currentSeasonData = recordSeason
      ? analysisData.filter((row) => row[8] === recordSeason)
      : analysisData;
    const globalCounts = {};
    currentSeasonData.forEach((row) => {
      const opp6 = row[1] ? row[1].split(", ") : [];
      opp6.forEach((name) => {
        globalCounts[name] = (globalCounts[name] || 0) + 1;
      });
    });
    const globalSortedIds = Object.keys(globalCounts)
      .sort((a, b) => globalCounts[b] - globalCounts[a])
      .map((name) => POKEMON_DATA[name])
      .filter(Boolean);

    // ★ 追加: PCなら24匹、スマホなら15匹に制限を切り替える
    const displayLimit = isPC ? 24 : 15;

    if (selectedIds.length === 0)
      return { suggested: globalSortedIds.slice(0, displayLimit) };

    const selectedNames = selectedIds
      .map((id) => POKE_BY_ID[id]?.name)
      .filter(Boolean);
    const coCounts = {};
    currentSeasonData.forEach((row) => {
      const opp6 = row[1] ? row[1].split(", ") : [];
      if (selectedNames.every((name) => opp6.includes(name))) {
        opp6.forEach((name) => {
          if (!selectedNames.includes(name))
            coCounts[name] = (coCounts[name] || 0) + 1;
        });
      }
    });
    const sortedIds = Object.keys(coCounts)
      .sort((a, b) => coCounts[b] - coCounts[a])
      .map((name) => POKEMON_DATA[name])
      .filter(Boolean);
    const fallbackIds = globalSortedIds.filter(
      (id) => !selectedIds.includes(id) && !sortedIds.includes(id),
    );

    // ★ ここも上限を displayLimit に変更
    return { suggested: [...sortedIds, ...fallbackIds].slice(0, displayLimit) };
  }, [selectedIds, analysisData, recordSeason, isPC]); // ★ isPC を依存配列に追加

  const stats = useMemo(() => {
    let filteredData = analysisData;
    if (selectedParty !== "すべて")
      filteredData = filteredData.filter((row) => row[7] === selectedParty);
    if (analysisSeason !== "すべて")
      filteredData = filteredData.filter((row) => row[8] === analysisSeason);
    const targetData =
      filterRange === "recent10" ? filteredData.slice(-10) : filteredData;

    const totalMatches = targetData.length;
    const winCount = targetData.filter((row) => row[4] === "勝ち").length;
    const winRate =
      totalMatches > 0 ? ((winCount / totalMatches) * 100).toFixed(1) : 0;

    let currentWins = 0;
    const trendData = targetData.map((row, index) => {
      if (row[4] === "勝ち") currentWins++;
      return {
        match: index + 1,
        winRate: parseFloat(((currentWins / (index + 1)) * 100).toFixed(1)),
      };
    });

    const oppStats = {},
      myPickCounts = {},
      oppLeadPairs = {},
      myLeadPairs = {};

    targetData.forEach((row) => {
      const isWin = row[4] === "勝ち";
      const opp6 = row[1] ? row[1].split(", ") : [];
      const opp4 = row[2] ? row[2].split(", ") : [];
      const my4 = row[3] ? row[3].split(", ") : [];
      const oppLead = row[6] ? row[6].split(", ") : [];
      const myLead = row[5] ? row[5].split(", ") : [];
      const hasLeadData = row[6] && String(row[6]).trim() !== "";
      const myBack = my4.filter((p) => !myLead.includes(p));

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
        if (opp4.includes(poke)) {
          oppStats[poke].pick += 1;
          if (isWin) oppStats[poke].pickWin += 1;
        }
        if (hasLeadData) {
          oppStats[poke].validLeadMatch += 1;
          if (oppLead.includes(poke)) oppStats[poke].lead += 1;
        }
      });

      my4.forEach((poke) => {
        myPickCounts[poke] = (myPickCounts[poke] || 0) + 1;
      });

      if (oppLead.length === 2) {
        const pair = [...oppLead].sort().join(" + ");
        if (!oppLeadPairs[pair])
          oppLeadPairs[pair] = { pokes: [...oppLead].sort(), count: 0, win: 0 };
        oppLeadPairs[pair].count += 1;
        if (isWin) oppLeadPairs[pair].win += 1;
      }
      if (myLead.length === 2) {
        const pair = [...myLead].sort().join(" + ");
        if (!myLeadPairs[pair])
          myLeadPairs[pair] = {
            pokes: [...myLead].sort(),
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

    let statsArray = Object.values(oppStats).map((s) => ({
      name: s.name,
      id: POKEMON_DATA[s.name] || 0,
      encounter: s.encounter,
      pickRate: s.encounter > 0 ? (s.pick / s.encounter) * 100 : 0,
      leadRate: s.validLeadMatch > 0 ? (s.lead / s.validLeadMatch) * 100 : 0,
      winRate: s.pick > 0 ? (s.pickWin / s.pick) * 100 : 0,
      pick: s.pick,
    }));

    statsArray.sort((a, b) => {
      if (sortTarget === "winRate") {
        if (a.pick === 0 && b.pick !== 0) return 1;
        if (b.pick === 0 && a.pick !== 0) return -1;
        if (a.pick === 0 && b.pick === 0) return b.encounter - a.encounter;
      }
      let diff = 0;
      if (sortTarget === "encounter")
        diff = a.encounter - b.encounter || a.pickRate - b.pickRate;
      else if (sortTarget === "pick")
        diff = a.pickRate - b.pickRate || a.encounter - b.encounter;
      else if (sortTarget === "lead")
        diff = a.leadRate - b.leadRate || a.encounter - b.encounter;
      else if (sortTarget === "winRate")
        diff = a.winRate - b.winRate || a.encounter - b.encounter;
      return sortOrder === "desc" ? -diff : diff;
    });

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
    analysisData,
    selectedParty,
    analysisSeason,
    filterRange,
    sortTarget,
    sortOrder,
  ]);

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
            setSelectedIds={setSelectedIds}
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
          <AnalysisTab
            isLoading={isLoading}
            stats={stats}
            selectedParty={selectedParty}
            setSelectedParty={setSelectedParty}
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
        )}
      </div>
      <Toast toast={toast} />
    </div>
  );
}
