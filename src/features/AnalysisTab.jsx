import { memo, useCallback, useMemo, useState } from "react";
import { POKEMON_DATA } from "../data/pokemon";
import { PokemonImage } from "../components/PokemonImage";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

const TrendChart = memo(function TrendChart({ trendData }) {
  const showDots = trendData.length <= 20;

  if (trendData.length <= 1) return null;

  return (
    <div
      className="md-card"
      style={{ padding: "16px 20px", marginBottom: "24px" }}
    >
      <h3 style={{ marginTop: 0, marginBottom: "16px" }}>勝率の推移</h3>
      <div style={{ width: "100%", height: "220px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={trendData}
            margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e0e0e0"
            />
            <XAxis
              dataKey="match"
              tickFormatter={(tick) => `${tick}戦`}
              tick={{ fontSize: 12, fill: "#5f6368" }}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 50, 100]}
              tickFormatter={(tick) => `${tick}%`}
              tick={{ fontSize: 12, fill: "#5f6368" }}
            />
            <Tooltip
              formatter={(value) => [`${value}%`, "勝率"]}
              labelFormatter={(label) => `${label}戦目時点`}
              contentStyle={{
                borderRadius: "8px",
                border: "none",
                boxShadow: "var(--shadow-md)",
                fontSize: "13px",
                fontWeight: "bold",
              }}
            />
            <ReferenceLine
              y={50}
              stroke="#FF3B30"
              strokeDasharray="3 3"
              opacity={0.6}
            />
            <Line
              type="monotone"
              dataKey="winRate"
              stroke="#1A73E8"
              strokeWidth={3}
              dot={
                showDots
                  ? {
                      r: 4,
                      fill: "#1A73E8",
                      strokeWidth: 2,
                      stroke: "#fff",
                    }
                  : false
              }
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

const OpponentStatsSection = memo(function OpponentStatsSection({
  statsArray,
  sortTarget,
  sortOrder,
  handleSort,
}) {
  return (
    <>
      <h2>相手ポケモンの統計データ</h2>
      <div className="sort-container">
        <button
          className={`sort-btn ${sortTarget === "encounter" ? "active" : ""}`}
          onClick={() => handleSort("encounter")}
        >
          遭遇回数{" "}
          {sortTarget === "encounter"
            ? sortOrder === "desc"
              ? "▼"
              : "▲"
            : ""}
        </button>
        <button
          className={`sort-btn ${sortTarget === "pick" ? "active" : ""}`}
          onClick={() => handleSort("pick")}
        >
          選出率 {sortTarget === "pick" ? (sortOrder === "desc" ? "▼" : "▲") : ""}
        </button>
        <button
          className={`sort-btn ${sortTarget === "lead" ? "active" : ""}`}
          onClick={() => handleSort("lead")}
        >
          先発率 {sortTarget === "lead" ? (sortOrder === "desc" ? "▼" : "▲") : ""}
        </button>
        <button
          className={`sort-btn ${sortTarget === "winRate" ? "active" : ""}`}
          onClick={() => handleSort("winRate")}
        >
          勝率{" "}
          {sortTarget === "winRate"
            ? sortOrder === "desc"
              ? "▼"
              : "▲"
            : ""}
        </button>
      </div>

      <div className="table-scroll">
        <table style={{ width: "100%" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "center", width: "35%" }}>ポケモン</th>
              <th>遭遇</th>
              <th>選出</th>
              <th>先発</th>
              <th>勝率</th>
            </tr>
          </thead>
          <tbody>
            {statsArray.map((stat) => (
              <tr key={stat.name}>
                <td className="poke-cell">
                  <PokemonImage pokeId={stat.id} name={stat.name} />
                  {stat.name}
                </td>
                <td>{stat.encounter}</td>
                <td>{stat.pickRate.toFixed(0)}%</td>
                <td>{stat.leadRate.toFixed(0)}%</td>
                <td
                  style={
                    stat.pick === 0
                      ? { color: "var(--text-sub)", fontWeight: "bold" }
                      : {
                          color: stat.winRate >= 50 ? "#34C759" : "#FF3B30",
                          fontWeight: "bold",
                        }
                  }
                >
                  {stat.pick === 0 ? "-" : `${stat.winRate.toFixed(0)}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
});

export function AnalysisTab({
  isLoading,
  stats,
  selectedParties,       /* ★ 修正: 引数の名前も複数形に統一 */
  setSelectedParties,    /* ★ 修正: 引数の名前も複数形に統一 */
  partyList,
  analysisSeason,
  setAnalysisSeason,
  analysisSeasonList,
  filterRange,
  setFilterRange,
  sortTarget,
  handleSort,
  sortOrder,
  handleAIAnalysis,
  isAiLoading,
  aiError,
  aiResult,
  isAiExpanded,
  setIsAiExpanded,
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const selectedPartySet = useMemo(
    () => new Set(selectedParties),
    [selectedParties],
  );
  const selectedPartyNames = useMemo(
    () =>
      selectedParties.length === 1 && !selectedPartySet.has("すべて")
        ? selectedParties[0].split(", ")
        : [],
    [selectedParties, selectedPartySet],
  );
  const partyOptions = useMemo(
    () =>
      partyList.map((partyStr) => ({
        partyStr,
        names: partyStr === "すべて" ? [] : partyStr.split(", "),
      })),
    [partyList],
  );
  const handlePartyToggle = useCallback(
    (partyStr) => {
      setSelectedParties((previous) => {
        if (partyStr === "すべて") return ["すべて"];

        let next = previous.filter((party) => party !== "すべて");
        next = next.includes(partyStr)
          ? next.filter((party) => party !== partyStr)
          : [...next, partyStr];

        return next.length === 0 ? ["すべて"] : next;
      });
    },
    [setSelectedParties],
  );

  return (
    <div role="tabpanel">
      {isLoading ? (
        <div className="loading">データを読み込み中...</div>
      ) : stats.totalMatches === 0 &&
        selectedPartySet.has("すべて") &&
        analysisSeason === "すべて" ? (
        <div className="loading">まだ対戦データがありません。</div>
      ) : (
        <div>
          {/* フィルターカード */}
          <div
            className="md-card"
            style={{ padding: "16px 20px", marginBottom: "24px" }}
          >
            <div style={{ marginBottom: "16px" }}>
              <label
                htmlFor="season-select"
                style={{
                  fontWeight: "500",
                  fontSize: "12px",
                  color: "#5f6368",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                対象シーズン
              </label>
              <select
                id="season-select"
                value={analysisSeason}
                onChange={(e) => setAnalysisSeason(e.target.value)}
                style={{ marginTop: 0, padding: "10px", marginBottom: "16px" }}
              >
                {analysisSeasonList.map((season, idx) => (
                  <option key={idx} value={season}>
                    {season}
                  </option>
                ))}
              </select>

              <label
                style={{
                  fontWeight: "500",
                  fontSize: "12px",
                  color: "#5f6368",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                対象パーティ
              </label>

              {/* 複数選択対応のカスタムプルダウン */}
              <div
                style={{ position: "relative", marginTop: "8px", zIndex: 100 }}
              >
                <button
                  onClick={() => setIsDropdownOpen((isOpen) => !isOpen)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "12px",
                    backgroundColor: "var(--app-bg)",
                    border: "none",
                    cursor: "pointer",
                    minHeight: "56px",
                  }}
                >
                  {/* ボタン部分の表示テキスト制御 */}
                  {selectedPartySet.has("すべて") ? (
                    <span
                      style={{
                        fontWeight: "bold",
                        color: "var(--text-main)",
                        fontSize: "15px",
                      }}
                    >
                      すべてのパーティ
                    </span>
                  ) : selectedParties.length === 1 ? (
                    <div className="dropdown-party-grid">
                      {selectedPartyNames.map((name, idx) => {
                        const id = POKEMON_DATA[name];
                        return (
                          <div
                            key={`${id}-${idx}`}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              minWidth: 0,
                            }}
                          >
                            {id && <PokemonImage pokeId={id} name={name} />}
                            <span
                              style={{
                                fontSize: "13px",
                                fontWeight: "500",
                                color: "var(--text-main)",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <span
                      style={{
                        fontWeight: "bold",
                        color: "#1A73E8",
                        fontSize: "15px",
                      }}
                    >
                      選択した {selectedParties.length} 件のパーティを合算中
                    </span>
                  )}
                  <span
                    style={{
                      transform: isDropdownOpen ? "rotate(180deg)" : "none",
                      transition: "0.2s",
                      fontSize: "12px",
                      color: "var(--text-sub)",
                      flexShrink: 0,
                      marginLeft: "8px",
                    }}
                  >
                    ▼
                  </span>
                </button>

                {/* チェックボックス付きのドロップダウンリスト */}
                {isDropdownOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 4px)",
                      left: 0,
                      right: 0,
                      backgroundColor: "var(--card-bg)",
                      borderRadius: "12px",
                      boxShadow: "var(--shadow-md)",
                      border: "1px solid var(--divider)",
                      maxHeight: "320px",
                      overflowY: "auto",
                      display: "flex",
                      flexDirection: "column",
                      padding: "4px",
                    }}
                  >
                    {partyOptions.map(({ partyStr, names }) => {
                      const isChecked = selectedPartySet.has(partyStr);
                      return (
                        <button
                          key={partyStr}
                          onClick={() => handlePartyToggle(partyStr)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            padding: "12px 16px",
                            borderRadius: "8px",
                            border: "none",
                            backgroundColor: isChecked
                              ? "var(--primary-light)"
                              : "transparent",
                            cursor: "pointer",
                            minHeight: "56px",
                            width: "100%",
                          }}
                        >
                          {/* チェックボックス風アイコン */}
                          <div
                            style={{
                              width: "20px",
                              height: "20px",
                              borderRadius: "4px",
                              border: isChecked
                                ? "none"
                                : "2px solid var(--divider)",
                              backgroundColor: isChecked ? "#1A73E8" : "white",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "white",
                              fontSize: "13px",
                              fontWeight: "bold",
                              flexShrink: 0,
                            }}
                          >
                            {isChecked && "✓"}
                          </div>

                          {/* アイコン表示 */}
                          {partyStr === "すべて" ? (
                            <span
                              style={{
                                fontWeight: "bold",
                                color: "var(--text-main)",
                                fontSize: "15px",
                              }}
                            >
                              すべてのパーティ
                            </span>
                          ) : (
                            <div className="party-icons">
                              {names.map((name, idx) => {
                                const id = POKEMON_DATA[name];
                                return id ? (
                                  <PokemonImage
                                    key={`${id}-${idx}`}
                                    pokeId={id}
                                    name={name}
                                  />
                                ) : (
                                  <span key={idx}>{name}</span>
                                );
                              })}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <label
              style={{
                fontWeight: "500",
                fontSize: "12px",
                color: "#5f6368",
                display: "block",
                marginBottom: "8px",
              }}
            >
              集計範囲
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className={`sort-btn ${filterRange === "all" ? "active" : ""}`}
                onClick={() => setFilterRange("all")}
                style={{
                  padding: "10px",
                  fontSize: "14px",
                  borderRadius: "8px",
                  margin: 0,
                }}
              >
                全期間
              </button>
              <button
                className={`sort-btn ${filterRange === "recent10" ? "active" : ""}`}
                onClick={() => setFilterRange("recent10")}
                style={{
                  padding: "10px",
                  fontSize: "14px",
                  borderRadius: "8px",
                  margin: 0,
                }}
              >
                直近10戦
              </button>
            </div>
          </div>

          {/* 戦績サマリー */}
          <div className="md-card stats-summary">
            集計対戦数<span>{stats.totalMatches}</span>戦 / 勝ち
            <span>{stats.winCount}</span>勝<br />
            勝率<span>{stats.winRate}</span>%
          </div>

          <TrendChart trendData={stats.trendData} />

          {/* AI環境分析 */}
          <div
            className="md-card"
            style={{ padding: "16px 20px", marginBottom: "24px" }}
          >
            <h3
              style={{
                marginTop: 0,
                marginBottom: "12px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              AI環境分析・戦術アドバイス
            </h3>
            <button
              className="save-btn"
              onClick={handleAIAnalysis}
              disabled={isAiLoading}
              style={{
                padding: "12px",
                fontSize: "15px",
                borderRadius: "12px",
                backgroundColor: isAiLoading ? "var(--divider)" : "#1A73E8",
                color: isAiLoading ? "var(--text-sub)" : "white",
              }}
            >
              {isAiLoading
                ? "データ分析中..."
                : "最新データからAI分析を実行する"}
            </button>

            {aiError && (
              <div
                style={{
                  marginTop: "12px",
                  padding: "12px",
                  backgroundColor: "var(--danger-light)",
                  borderRadius: "8px",
                  color: "var(--danger)",
                  fontSize: "13px",
                  fontWeight: "bold",
                  lineHeight: "1.4",
                }}
              >
                {aiError}
              </div>
            )}

            {aiResult && (
              <div style={{ marginTop: "16px" }}>
                <button
                  onClick={() => setIsAiExpanded(!isAiExpanded)}
                  style={{
                    background: "transparent",
                    border: "1px solid var(--divider)",
                    borderRadius: "8px",
                    color: "var(--text-main)",
                    fontSize: "13px",
                    width: "100%",
                    padding: "10px",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "6px",
                    fontWeight: "600",
                  }}
                >
                  {isAiExpanded
                    ? "▲ 分析結果を折りたたむ"
                    : "▼ 分析結果を展開する"}
                </button>
                {isAiExpanded && (
                  <div
                    style={{
                      marginTop: "12px",
                      padding: "16px",
                      backgroundColor: "var(--app-bg)",
                      borderRadius: "12px",
                      fontSize: "14px",
                      lineHeight: "1.6",
                      whiteSpace: "pre-wrap",
                      textAlign: "left",
                      color: "var(--text-main)",
                      maxHeight: "280px",
                      overflowY: "auto",
                      border: "1px inset rgba(0,0,0,0.05)",
                    }}
                  >
                    {aiResult}
                  </div>
                )}
              </div>
            )}
          </div>

          <OpponentStatsSection
            statsArray={stats.statsArray}
            sortTarget={sortTarget}
            sortOrder={sortOrder}
            handleSort={handleSort}
          />

          {/* 相手の先発ペア TOP5 */}
          <h2>相手のよく来る先発ペア（TOP5）</h2>
          <div className="table-scroll">
            <table style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ width: "50%", textAlign: "center" }}>
                    先発ペア
                  </th>
                  <th style={{ width: "25%", textAlign: "center" }}>遭遇</th>
                  <th style={{ width: "25%", textAlign: "center" }}>勝率</th>
                </tr>
              </thead>
              <tbody>
                {stats.oppLeadPairStats.map((s, idx) => (
                  <tr key={idx}>
                    <td
                      className="poke-cell"
                      style={{
                        flexDirection: "column",
                        alignItems: "flex-start",
                        gap: "4px",
                        padding: "8px 8px 8px 20px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <PokemonImage
                          pokeId={POKEMON_DATA[s.pokes[0]]}
                          name={s.pokes[0]}
                        />
                        <span>{s.pokes[0]}</span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <PokemonImage
                          pokeId={POKEMON_DATA[s.pokes[1]]}
                          name={s.pokes[1]}
                        />
                        <span>{s.pokes[1]}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: "15px", verticalAlign: "middle" }}>
                      {s.count}
                    </td>
                    <td
                      style={{
                        color: s.winRate >= 50 ? "#34C759" : "#FF3B30",
                        fontWeight: "bold",
                        fontSize: "15px",
                        verticalAlign: "middle",
                      }}
                    >
                      {s.winRate.toFixed(0)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 自分の先発・後発相関 */}
          <h2>自分の先発ペアとよく選ぶ後発（TOP5）</h2>
          <div className="table-scroll">
            <table style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ width: "32%", textAlign: "center" }}>
                    先発ペア
                  </th>
                  <th style={{ width: "15%", textAlign: "center" }}>選出</th>
                  <th style={{ width: "15%", textAlign: "center" }}>勝率</th>
                  <th style={{ width: "38%", textAlign: "center" }}>
                    よく選ぶ後発
                    <br />
                    <span style={{ fontSize: "10px", fontWeight: "normal" }}>
                      選出 / 勝率
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.myLeadPairStats.map((s, idx) => (
                  <tr key={idx}>
                    <td
                      style={{
                        padding: "8px",
                        verticalAlign: "middle",
                        borderBottom: "none",
                      }}
                    >
                      <div
                        style={{
                          width: "fit-content",
                          margin: "0 auto",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-start",
                          gap: "4px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <PokemonImage
                            pokeId={POKEMON_DATA[s.pokes[0]]}
                            name={s.pokes[0]}
                          />
                          <span
                            style={{
                              fontSize: "14px",
                              fontWeight: "500",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {s.pokes[0]}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <PokemonImage
                            pokeId={POKEMON_DATA[s.pokes[1]]}
                            name={s.pokes[1]}
                          />
                          <span
                            style={{
                              fontSize: "14px",
                              fontWeight: "500",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {s.pokes[1]}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td
                      style={{
                        fontSize: "15px",
                        textAlign: "center",
                        verticalAlign: "middle",
                      }}
                    >
                      {s.count}
                    </td>
                    <td
                      style={{
                        color: s.winRate >= 50 ? "#34C759" : "#FF3B30",
                        fontWeight: "bold",
                        fontSize: "15px",
                        borderRight: "1px dashed var(--divider)",
                        textAlign: "center",
                        verticalAlign: "middle",
                      }}
                    >
                      {s.winRate.toFixed(0)}%
                    </td>
                    <td
                      style={{
                        textAlign: "center",
                        padding: "8px 4px",
                        verticalAlign: "middle",
                      }}
                    >
                      {s.bestBacks.slice(0, 2).map((back, i) => (
                        <div
                          key={back.name}
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "2px",
                            marginBottom:
                              i === 0 && s.bestBacks.length > 1 ? "8px" : "0",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              transform: "scale(0.85)",
                              transformOrigin: "center",
                              marginRight: "-6px",
                            }}
                          >
                            {back.pokes[0] && (
                              <PokemonImage
                                pokeId={POKEMON_DATA[back.pokes[0]]}
                                name={back.pokes[0]}
                              />
                            )}
                            {back.pokes[1] && (
                              <PokemonImage
                                pokeId={POKEMON_DATA[back.pokes[1]]}
                                name={back.pokes[1]}
                              />
                            )}
                          </div>
                          <span
                            style={{
                              color: back.winRate >= 50 ? "#34C759" : "#FF3B30",
                              fontWeight: "bold",
                              fontSize: "11px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {back.count}回 ({back.winRate.toFixed(0)}%)
                          </span>
                        </div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 自分の選出回数 */}
          <h2>自分のポケモンの選出回数</h2>
          <div className="table-scroll">
            <table style={{ width: "100%" }}>
              <tbody>
                {stats.myStatsArray.map((s) => (
                  <tr key={s.name}>
                    <td className="poke-cell" style={{ width: "35%" }}>
                      <PokemonImage pokeId={s.id} name={s.name} />
                      {s.name}
                    </td>
                    <td
                      style={{
                        width: "65%",
                        textAlign: "left",
                        paddingRight: "12px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#5f6368",
                          marginBottom: "2px",
                        }}
                      >
                        {s.count}回 (
                        {stats.totalMatches > 0
                          ? ((s.count / stats.totalMatches) * 100).toFixed(0)
                          : 0}
                        %)
                      </div>
                      <div className="bar-wrap">
                        <div
                          className="bar-inner"
                          style={{
                            width: `${(s.count / stats.totalMatches) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
