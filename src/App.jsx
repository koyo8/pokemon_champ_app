import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import './index.css';

import { POKEMON_DATA, fullPokeList, POKE_BY_ID } from './data/pokemon';
import { Toast } from './components/Toast';

// 切り出したコンポーネントのインポート
import { RecordTab } from './features/RecordTab';
import { AnalysisTab } from './features/AnalysisTab';

const GAS_URL = "https://script.google.com/macros/s/AKfycbx9FUGeI3g7v6AU5pAT8JPTlA1geF0v8FY79um5bc3IXdTm78sg1cVpV4Xu0QQmNr75/exec";

export default function App() {
    const [currentTab, setCurrentTab] = useState('record');
    
    // データ共有系State
    const [analysisData, setAnalysisData] = useState(() => {
        const saved = localStorage.getItem('vgc_analysis_data');
        return saved ? JSON.parse(saved) : [];
    });

    const [myPartyIds, setMyPartyIds] = useState(() => {
        const saved = localStorage.getItem('my_vgc_party');
        return saved ? JSON.parse(saved) : [];
    });

    // 記録タブ専用State（モーダル以外）
    const [recordSeason, setRecordSeason] = useState(() => localStorage.getItem('vgc_season') || "");
    const [isSeasonEditing, setIsSeasonEditing] = useState(false);
    const [isSeasonDropdownOpen, setIsSeasonDropdownOpen] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [selectedIds, setSelectedIds] = useState([]);
    const [oppPickedIds, setOppPickedIds] = useState([]);
    const [myPickedIds, setMyPickedIds] = useState([]);
    const [matchResult, setMatchResult] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // 分析タブ専用State
    const [analysisSeason, setAnalysisSeason] = useState("すべて");
    const [selectedParty, setSelectedParty] = useState("すべて");
    const [filterRange, setFilterRange] = useState('all');
    const [sortTarget, setSortTarget] = useState('encounter');
    const [sortOrder, setSortOrder] = useState('desc');
    const [aiResult, setAiResult] = useState("");
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [isAiExpanded, setIsAiExpanded] = useState(true);
    const [aiError, setAiError] = useState("");

    // システム系
    const [isLoading, setIsLoading] = useState(() => !localStorage.getItem('vgc_analysis_data'));
    const [toast, setToast] = useState(null);
    const toastTimeoutRef = useRef(null);
    const isFirstLoad = useRef(true);
    const isFetchingRef = useRef(false);

    const showToast = useCallback((message, type = 'error') => {
        setToast({ message, type });
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = setTimeout(() => setToast(null), 3000);
    }, []);

    // データフェッチ
    const fetchAnalysisData = useCallback(async (isManualReload = false) => {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;

        const hasCache = !!localStorage.getItem('vgc_analysis_data');
        if (!hasCache || isManualReload) setIsLoading(true);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒へ延長

        try {
            const response = await fetch(GAS_URL, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error(`通信エラー`);

            const rawRows = await response.json();
            const dataRows = rawRows.filter(row => row && row.join("").trim() !== "" && row[0] !== "日時" && row[4] !== "勝敗");

            localStorage.setItem('vgc_analysis_data', JSON.stringify(dataRows));

            if (isFirstLoad.current && dataRows.length > 0) {
                isFirstLoad.current = false;
                const latestRow = dataRows[dataRows.length - 1];
                if (latestRow[7]) {
                    setSelectedParty(latestRow[7]);
                    const names = latestRow[7].split(", ");
                    const ids = names.map(name => POKEMON_DATA[name]).filter(Boolean);
                    if (ids.length === 6) {
                        setMyPartyIds(ids);
                        localStorage.setItem('my_vgc_party', JSON.stringify(ids));
                    }
                }
                if (latestRow[8] && latestRow[8].trim() !== "") setAnalysisSeason(latestRow[8]);
            }
            setAnalysisData(dataRows);
            if (isManualReload) showToast("データを最新化しました", "success");
        } catch (error) {
            clearTimeout(timeoutId);
            if (isManualReload || !hasCache) {
                showToast(error.name === 'AbortError' ? "通信がタイムアウトしました" : "データの読み込みに失敗しました");
            }
        } finally {
            setIsLoading(false);
            isFetchingRef.current = false;
        }
    }, [showToast]);

    useEffect(() => { fetchAnalysisData(); }, [fetchAnalysisData]);

    const handleReload = useCallback(() => { window.location.reload(); }, []);

    // 共通のデータ抽出ロジック (useMemo)
    const availableSeasons = useMemo(() => {
        return [...new Set(analysisData.map(row => row[8]).filter(s => s && String(s).trim() !== ""))];
    }, [analysisData]);

    const partyList = useMemo(() => {
        let filtered = analysisData;
        if (analysisSeason !== "すべて") filtered = filtered.filter(row => row[8] === analysisSeason);
        return ["すべて", ...new Set(filtered.map(row => row[7]).filter(Boolean))];
    }, [analysisData, analysisSeason]);

    useEffect(() => {
        if (selectedParty !== "すべて" && !partyList.includes(selectedParty)) setSelectedParty("すべて");
    }, [partyList, selectedParty]);

    const analysisSeasonList = useMemo(() => ["すべて", ...availableSeasons], [availableSeasons]);
    const myPartyList = useMemo(() => myPartyIds.map(id => POKE_BY_ID[id]).filter(Boolean), [myPartyIds]);

    // ハンドラー群
    const handleToggleOpp6 = useCallback((id, isSelected) => {
        if (isSelected) {
            setSelectedIds(prev => prev.filter(pId => pId !== id));
            setOppPickedIds(prev => prev.filter(pId => pId !== id));
        } else {
            if (selectedIds.length >= 6) return showToast("選べるのは6匹までです");
            setSelectedIds(prev => [...prev, id]);
            setSearchText("");
        }
    }, [selectedIds.length, showToast]);

    const handleToggleOppPick = useCallback((id, isSelected) => {
        if (!isSelected && oppPickedIds.length >= 4) return showToast("選出できるのは4匹までです");
        setOppPickedIds(prev => isSelected ? prev.filter(i => i !== id) : [...prev, id]);
    }, [oppPickedIds.length, showToast]);

    const handleToggleMyPick = useCallback((id, isSelected) => {
        if (!isSelected && myPickedIds.length >= 4) return showToast("選出できるのは4匹までです");
        setMyPickedIds(prev => isSelected ? prev.filter(i => i !== id) : [...prev, id]);
    }, [myPickedIds.length, showToast]);

    const handleSort = (target) => {
        if (sortTarget === target) setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
        else { setSortTarget(target); setSortOrder('desc'); }
    };

    // 記録保存
    const handleSave = useCallback(async () => {
        if (selectedIds.length === 0) return showToast("相手のパーティを1匹以上選んでください");
        if (oppPickedIds.length < 2) return showToast("相手の選出を2匹以上選んでください");
        if (myPartyIds.length !== 6) return showToast("自分のパーティを6匹設定してください");
        if (myPickedIds.length !== 4) return showToast("自分の選出を4匹選んでください");
        if (!matchResult) return showToast("勝敗を選択してください");

        setIsSaving(true);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        const payload = {
            opp_6: selectedIds.map(id => POKE_BY_ID[id].name).join(", "),
            opp_4: oppPickedIds.map(id => POKE_BY_ID[id].name).join(", "),
            opp_lead: oppPickedIds.slice(0, 2).map(id => POKE_BY_ID[id].name).join(", "),
            my_4: myPickedIds.map(id => POKE_BY_ID[id].name).join(", "),
            my_lead: myPickedIds.slice(0, 2).map(id => POKE_BY_ID[id].name).join(", "),
            my_party: myPartyIds.map(id => POKE_BY_ID[id].name).sort().join(", "),
            result: matchResult,
            season: recordSeason 
        };

        try {
            await fetch(GAS_URL, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(payload), signal: controller.signal });
            clearTimeout(timeoutId);
            showToast("記録を保存しました", "success");
            setSearchText(""); setSelectedIds([]); setOppPickedIds([]); setMyPickedIds([]); setMatchResult(null);
            localStorage.setItem('vgc_season', recordSeason);
            fetchAnalysisData();
        } catch (error) {
            clearTimeout(timeoutId);
            showToast(error.name === 'AbortError' ? "通信がタイムアウトしました。電波環境を確認してください。" : "保存に失敗しました");
        } finally {
            setIsSaving(false);
        }
    }, [selectedIds, oppPickedIds, myPartyIds, myPickedIds, matchResult, recordSeason, showToast, fetchAnalysisData]);

    // 相手パーティサジェストロジック
    const suggestedIds = useMemo(() => {
        const currentSeasonData = recordSeason ? analysisData.filter(row => row[8] === recordSeason) : analysisData;
        const globalCounts = {};
        currentSeasonData.forEach(row => {
            const opp6 = row[1] ? row[1].split(", ") : [];
            opp6.forEach(name => { globalCounts[name] = (globalCounts[name] || 0) + 1; });
        });
        const globalSortedIds = Object.keys(globalCounts).sort((a, b) => globalCounts[b] - globalCounts[a]).map(name => POKEMON_DATA[name]).filter(Boolean);

        if (selectedIds.length === 0) return { suggested: globalSortedIds.slice(0, 15) };

        const selectedNames = selectedIds.map(id => POKE_BY_ID[id]?.name).filter(Boolean);
        const coCounts = {};
        currentSeasonData.forEach(row => {
            const opp6 = row[1] ? row[1].split(", ") : [];
            if (selectedNames.every(name => opp6.includes(name))) {
                opp6.forEach(name => { if (!selectedNames.includes(name)) coCounts[name] = (coCounts[name] || 0) + 1; });
            }
        });
        const sortedIds = Object.keys(coCounts).sort((a, b) => coCounts[b] - coCounts[a]).map(name => POKEMON_DATA[name]).filter(Boolean);
        const fallbackIds = globalSortedIds.filter(id => !selectedIds.includes(id) && !sortedIds.includes(id));
        return { suggested: [...sortedIds, ...fallbackIds].slice(0, 15) };
    }, [selectedIds, analysisData, recordSeason]);

    // 統計計算ロジック
    const stats = useMemo(() => {
        let filteredData = analysisData;
        if (selectedParty !== "すべて") filteredData = filteredData.filter(row => row[7] === selectedParty);
        if (analysisSeason !== "すべて") filteredData = filteredData.filter(row => row[8] === analysisSeason);
        const targetData = filterRange === 'recent10' ? filteredData.slice(-10) : filteredData;

        const totalMatches = targetData.length;
        const winCount = targetData.filter(row => row[4] === '勝ち').length;
        const winRate = totalMatches > 0 ? ((winCount / totalMatches) * 100).toFixed(1) : 0;

        const oppStats = {}, myPickCounts = {}, oppLeadPairs = {}, myLeadPairs = {};

        targetData.forEach(row => {
            const isWin = row[4] === '勝ち';
            const opp6 = row[1] ? row[1].split(", ") : [];
            const opp4 = row[2] ? row[2].split(", ") : [];
            const my4 = row[3] ? row[3].split(", ") : [];
            const oppLead = row[6] ? row[6].split(", ") : [];
            const myLead = row[5] ? row[5].split(", ") : [];
            const hasLeadData = row[6] && String(row[6]).trim() !== "";
            const myBack = my4.filter(p => !myLead.includes(p));

            opp6.forEach(poke => {
                if (!oppStats[poke]) oppStats[poke] = { name: poke, encounter: 0, pick: 0, lead: 0, validLeadMatch: 0, pickWin: 0 };
                oppStats[poke].encounter += 1;
                if (opp4.includes(poke)) { oppStats[poke].pick += 1; if (isWin) oppStats[poke].pickWin += 1; }
                if (hasLeadData) { oppStats[poke].validLeadMatch += 1; if (oppLead.includes(poke)) oppStats[poke].lead += 1; }
            });

            my4.forEach(poke => { myPickCounts[poke] = (myPickCounts[poke] || 0) + 1; });

            if (oppLead.length === 2) {
                const pair = [...oppLead].sort().join(" + ");
                if (!oppLeadPairs[pair]) oppLeadPairs[pair] = { pokes: [...oppLead].sort(), count: 0, win: 0 };
                oppLeadPairs[pair].count += 1; if (isWin) oppLeadPairs[pair].win += 1;
            }
            if (myLead.length === 2) {
                const pair = [...myLead].sort().join(" + ");
                if (!myLeadPairs[pair]) myLeadPairs[pair] = { pokes: [...myLead].sort(), count: 0, win: 0, backs: {} };
                myLeadPairs[pair].count += 1; if (isWin) myLeadPairs[pair].win += 1;
                if (myBack.length === 2) {
                    const bPair = [...myBack].sort().join(" + ");
                    if (!myLeadPairs[pair].backs[bPair]) myLeadPairs[pair].backs[bPair] = { count: 0, win: 0 };
                    myLeadPairs[pair].backs[bPair].count += 1; if (isWin) myLeadPairs[pair].backs[bPair].win += 1;
                }
            }
        });

        let statsArray = Object.values(oppStats).map(s => ({
            name: s.name, id: POKEMON_DATA[s.name] || 0, encounter: s.encounter,
            pickRate: s.encounter > 0 ? (s.pick / s.encounter) * 100 : 0,
            leadRate: s.validLeadMatch > 0 ? (s.lead / s.validLeadMatch) * 100 : 0,
            winRate: s.pick > 0 ? (s.pickWin / s.pick) * 100 : 0, pick: s.pick
        }));

        statsArray.sort((a, b) => {
            if (sortTarget === 'winRate') {
                if (a.pick === 0 && b.pick !== 0) return 1;
                if (b.pick === 0 && a.pick !== 0) return -1;
                if (a.pick === 0 && b.pick === 0) return b.encounter - a.encounter;
            }
            let diff = 0;
            if (sortTarget === 'encounter') diff = a.encounter - b.encounter || a.pickRate - b.pickRate;
            else if (sortTarget === 'pick') diff = a.pickRate - b.pickRate || a.encounter - b.encounter;
            else if (sortTarget === 'lead') diff = a.leadRate - b.leadRate || a.encounter - b.encounter;
            else if (sortTarget === 'winRate') diff = a.winRate - b.winRate || a.encounter - b.encounter;
            return sortOrder === 'desc' ? -diff : diff;
        });

        const myStatsArray = Object.entries(myPickCounts).map(([name, count]) => ({ name, count, id: POKEMON_DATA[name] || 0 })).sort((a, b) => b.count - a.count);
        const oppLeadPairStats = Object.values(oppLeadPairs).map(s => ({ ...s, winRate: (s.win / s.count) * 100 })).sort((a, b) => b.count - a.count).slice(0, 5);
        const myLeadPairStats = Object.values(myLeadPairs).map(s => {
            const bestBacks = Object.entries(s.backs).map(([name, b]) => ({ name, pokes: name.split(" + "), count: b.count, winRate: (b.win / b.count) * 100 })).sort((a, b) => b.count - a.count);
            return { ...s, winRate: (s.win / s.count) * 100, bestBacks };
        }).sort((a, b) => b.count - a.count).slice(0, 5);

        return { totalMatches, winCount, winRate, statsArray, myStatsArray, oppLeadPairStats, myLeadPairStats };
    }, [analysisData, selectedParty, analysisSeason, filterRange, sortTarget, sortOrder]);

    // AI分析
    const handleAIAnalysis = useCallback(async () => {
        if (stats.totalMatches === 0) { setAiError("対戦データがありません"); return; }
        setIsAiLoading(true); setAiResult(""); setAiError("");
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        const compactStats = {
            totalMatches: stats.totalMatches, winRate: stats.winRate,
            oppStats: stats.statsArray.slice(0, 10).map(s => `${s.name}: 遭遇${s.encounter}回 勝率${s.winRate.toFixed(0)}%`),
            myLeadPairs: stats.myLeadPairStats.map(s => `${s.pokes.join("+")}: 選出${s.count}回 勝率${s.winRate.toFixed(0)}%`)
        };

        try {
            const response = await fetch(GAS_URL, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ action: "analyze", stats_json: JSON.stringify(compactStats) }), signal: controller.signal });
            clearTimeout(timeoutId);
            const data = await response.json();
            if (data.error) setAiError(data.error);
            else { setAiResult(data.result); setIsAiExpanded(true); }
        } catch (error) {
            clearTimeout(timeoutId);
            setAiError(error.name === 'AbortError' ? "🚨 AIの分析がタイムアウトしました" : "🚨 エラー詳細: " + error.message);
        } finally { setIsAiLoading(false); }
    }, [stats]);

    return (
        <div>
            <div className="sticky-top">
                <div className="header-container">
                    <img src="/logo.png" alt="Logo" className="app-logo" />
                    <div className="title-wrapper">
                        <h1 className="app-title"><span className="title-log">Log</span><span className="title-dex">Dex</span></h1>
                        <div className="app-subtitle">Pokémon Champions</div>
                    </div>
                    <button className="reload-btn" onClick={handleReload} aria-label="ページを再読み込み">
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" /></svg>
                    </button>
                </div>
                <div className="tab-container" role="tablist" aria-label="メインメニュー">
                    <button className={`tab-btn ${currentTab === 'record' ? 'active' : ''}`} onClick={() => setCurrentTab('record')} role="tab" aria-selected={currentTab === 'record'}>記録</button>
                    <button className={`tab-btn ${currentTab === 'analysis' ? 'active' : ''}`} onClick={() => setCurrentTab('analysis')} role="tab" aria-selected={currentTab === 'analysis'}>分析</button>
                </div>
            </div>

            <div className="content-area">
                {currentTab === 'record' ? (
                    <RecordTab
                        recordSeason={recordSeason} setRecordSeason={setRecordSeason} isSeasonEditing={isSeasonEditing} setIsSeasonEditing={setIsSeasonEditing} isSeasonDropdownOpen={isSeasonDropdownOpen} setIsSeasonDropdownOpen={setIsSeasonDropdownOpen} availableSeasons={availableSeasons}
                        selectedIds={selectedIds} setSelectedIds={setSelectedIds} handleToggleOpp6={handleToggleOpp6} searchText={searchText} setSearchText={setSearchText} suggestedIds={suggestedIds}
                        oppPickedIds={oppPickedIds} handleToggleOppPick={handleToggleOppPick} isLoading={isLoading}
                        myPartyIds={myPartyIds} setMyPartyIds={setMyPartyIds} myPartyList={myPartyList} myPickedIds={myPickedIds} handleToggleMyPick={handleToggleMyPick} setMyPickedIds={setMyPickedIds}
                        matchResult={matchResult} setMatchResult={setMatchResult} handleSave={handleSave} isSaving={isSaving} showToast={showToast}
                    />
                ) : (
                    <AnalysisTab
                        isLoading={isLoading} stats={stats} selectedParty={selectedParty} setSelectedParty={setSelectedParty} partyList={partyList}
                        analysisSeason={analysisSeason} setAnalysisSeason={setAnalysisSeason} analysisSeasonList={analysisSeasonList}
                        filterRange={filterRange} setFilterRange={setFilterRange} sortTarget={sortTarget} handleSort={handleSort} sortOrder={sortOrder}
                        handleAIAnalysis={handleAIAnalysis} isAiLoading={isAiLoading} aiError={aiError} aiResult={aiResult} isAiExpanded={isAiExpanded} setIsAiExpanded={setIsAiExpanded}
                    />
                )}
            </div>
            <Toast toast={toast} />
        </div>
    );
}