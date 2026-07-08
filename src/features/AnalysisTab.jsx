import { POKEMON_DATA } from '../data/pokemon';
import { PokemonImage } from '../components/PokemonImage';

export function AnalysisTab({
    isLoading, stats, selectedParty, setSelectedParty, partyList,
    analysisSeason, setAnalysisSeason, analysisSeasonList,
    filterRange, setFilterRange, sortTarget, handleSort, sortOrder,
    handleAIAnalysis, isAiLoading, aiError, aiResult, isAiExpanded, setIsAiExpanded
}) {
    return (
        <div role="tabpanel">
            {isLoading ? (
                <div className="loading">データを読み込み中...</div>
            ) : (stats.totalMatches === 0 && selectedParty === "すべて" && analysisSeason === "すべて") ? (
                <div className="loading">まだ対戦データがありません。</div>
            ) : (
                <div>
                    {/* フィルターカード */}
                    <div className="md-card" style={{ padding: '16px 20px', marginBottom: '24px' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '16px' }}>分析フィルター</h3>
                        <div style={{ marginBottom: '16px' }}>
                            <label htmlFor="season-select" style={{ fontWeight: '500', fontSize: '12px', color: '#5f6368', display: 'block', marginBottom: '4px' }}>対象シーズン</label>
                            <select id="season-select" value={analysisSeason} onChange={(e) => setAnalysisSeason(e.target.value)} style={{ marginTop: 0, padding: '10px', marginBottom: '16px' }}>
                                {analysisSeasonList.map((season, idx) => <option key={idx} value={season}>{season}</option>)}
                            </select>

                            <label htmlFor="party-select" style={{ fontWeight: '500', fontSize: '12px', color: '#5f6368', display: 'block', marginBottom: '4px' }}>対象パーティ</label>
                            <select id="party-select" value={selectedParty} onChange={(e) => setSelectedParty(e.target.value)} style={{ marginTop: 0, padding: '10px' }}>
                                {partyList.map((party, idx) => <option key={idx} value={party}>{party}</option>)}
                            </select>
                        </div>

                        <label style={{ fontWeight: '500', fontSize: '12px', color: '#5f6368', display: 'block', marginBottom: '8px' }}>集計範囲</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button className={`sort-btn ${filterRange === 'all' ? 'active' : ''}`} onClick={() => setFilterRange('all')} style={{ padding: '10px', fontSize: '14px', borderRadius: '8px', margin: 0 }}>全期間</button>
                            <button className={`sort-btn ${filterRange === 'recent10' ? 'active' : ''}`} onClick={() => setFilterRange('recent10')} style={{ padding: '10px', fontSize: '14px', borderRadius: '8px', margin: 0 }}>直近10戦</button>
                        </div>
                    </div>

                    {/* 戦績サマリー */}
                    <div className="md-card stats-summary">集計対戦数<span>{stats.totalMatches}</span>戦 / 勝ち<span>{stats.winCount}</span>勝<br />勝率<span>{stats.winRate}</span>%</div>

                    {/* AI環境分析 */}
                    <div className="md-card" style={{ padding: '16px 20px', marginBottom: '24px' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>AI環境分析・戦術アドバイス</h3>
                        <button className="save-btn" onClick={handleAIAnalysis} disabled={isAiLoading} style={{ padding: '12px', fontSize: '15px', borderRadius: '12px', backgroundColor: isAiLoading ? 'var(--divider)' : '#1A73E8', color: isAiLoading ? 'var(--text-sub)' : 'white' }}>
                            {isAiLoading ? "データ分析中..." : "最新データからAI分析を実行する"}
                        </button>

                        {aiError && <div style={{ marginTop: '12px', padding: '12px', backgroundColor: 'var(--danger-light)', borderRadius: '8px', color: 'var(--danger)', fontSize: '13px', fontWeight: 'bold', lineHeight: '1.4' }}>{aiError}</div>}

                        {aiResult && (
                            <div style={{ marginTop: '16px' }}>
                                <button onClick={() => setIsAiExpanded(!isAiExpanded)} style={{ background: 'transparent', border: '1px solid var(--divider)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '13px', width: '100%', padding: '10px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
                                    {isAiExpanded ? '▲ 分析結果を折りたたむ' : '▼ 分析結果を展開する'}
                                </button>
                                {isAiExpanded && (
                                    <div style={{ marginTop: '12px', padding: '16px', backgroundColor: 'var(--app-bg)', borderRadius: '12px', fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap', textAlign: 'left', color: 'var(--text-main)', maxHeight: '280px', overflowY: 'auto', border: '1px inset rgba(0,0,0,0.05)' }}>{aiResult}</div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 相手ポケモンの統計データ */}
                    <h2>相手ポケモンの統計データ</h2>
                    <div className="sort-container">
                        <button className={`sort-btn ${sortTarget === 'encounter' ? 'active' : ''}`} onClick={() => handleSort('encounter')}>遭遇回数 {sortTarget === 'encounter' ? (sortOrder === 'desc' ? '▼' : '▲') : ''}</button>
                        <button className={`sort-btn ${sortTarget === 'pick' ? 'active' : ''}`} onClick={() => handleSort('pick')}>選出率 {sortTarget === 'pick' ? (sortOrder === 'desc' ? '▼' : '▲') : ''}</button>
                        <button className={`sort-btn ${sortTarget === 'lead' ? 'active' : ''}`} onClick={() => handleSort('lead')}>先発率 {sortTarget === 'lead' ? (sortOrder === 'desc' ? '▼' : '▲') : ''}</button>
                        <button className={`sort-btn ${sortTarget === 'winRate' ? 'active' : ''}`} onClick={() => handleSort('winRate')}>勝率 {sortTarget === 'winRate' ? (sortOrder === 'desc' ? '▼' : '▲') : ''}</button>
                    </div>

                    <div className="table-scroll">
                        <table style={{ width: '100%' }}>
                            <thead><tr><th style={{ textAlign: 'center', width: '35%' }}>ポケモン</th><th>遭遇</th><th>選出</th><th>先発</th><th>勝率</th></tr></thead>
                            <tbody>
                                {stats.statsArray.map((s) => (
                                    <tr key={s.name}>
                                        <td className="poke-cell"><PokemonImage pokeId={s.id} name={s.name} />{s.name}</td>
                                        <td>{s.encounter}</td><td>{s.pickRate.toFixed(0)}%</td><td>{s.leadRate.toFixed(0)}%</td>
                                        <td style={s.pick === 0 ? { color: 'var(--text-sub)', fontWeight: 'bold' } : { color: s.winRate >= 50 ? '#34C759' : '#FF3B30', fontWeight: 'bold' }}>
                                            {s.pick === 0 ? '-' : `${s.winRate.toFixed(0)}%`}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* 相手の先発ペア TOP5 */}
                    <h2>相手のよく来る先発ペア（TOP5）</h2>
                    <div className="table-scroll">
                        <table style={{ width: '100%' }}>
                            <thead><tr><th style={{ width: '50%', textAlign: 'center' }}>先発ペア</th><th style={{ width: '25%', textAlign: 'center' }}>遭遇</th><th style={{ width: '25%', textAlign: 'center' }}>勝率</th></tr></thead>
                            <tbody>
                                {stats.oppLeadPairStats.map((s, idx) => (
                                    <tr key={idx}>
                                        <td className="poke-cell" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px', padding: '8px 8px 8px 20px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><PokemonImage pokeId={POKEMON_DATA[s.pokes[0]]} name={s.pokes[0]} /><span>{s.pokes[0]}</span></div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><PokemonImage pokeId={POKEMON_DATA[s.pokes[1]]} name={s.pokes[1]} /><span>{s.pokes[1]}</span></div>
                                        </td>
                                        <td style={{ fontSize: '15px', verticalAlign: 'middle' }}>{s.count}</td>
                                        <td style={{ color: s.winRate >= 50 ? '#34C759' : '#FF3B30', fontWeight: 'bold', fontSize: '15px', verticalAlign: 'middle' }}>{s.winRate.toFixed(0)}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* 自分の先発・後発相関 */}
                    <h2>自分の先発ペアとよく選ぶ後発（TOP5）</h2>
                    <div className="table-scroll">
                        <table style={{ width: '100%' }}>
                            <thead><tr><th style={{ width: '32%', textAlign: 'center' }}>先発ペア</th><th style={{ width: '15%', textAlign: 'center' }}>選出</th><th style={{ width: '15%', textAlign: 'center' }}>勝率</th><th style={{ width: '38%', textAlign: 'center' }}>よく選ぶ後発<br /><span style={{ fontSize: '10px', fontWeight: 'normal' }}>選出 / 勝率</span></th></tr></thead>
                            <tbody>
                                {stats.myLeadPairStats.map((s, idx) => (
                                    <tr key={idx}>
                                        <td style={{ padding: '8px', verticalAlign: 'middle', borderBottom: 'none' }}>
                                            <div style={{ width: 'fit-content', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><PokemonImage pokeId={POKEMON_DATA[s.pokes[0]]} name={s.pokes[0]} /><span style={{ fontSize: '14px', fontWeight: '500', whiteSpace: 'nowrap' }}>{s.pokes[0]}</span></div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><PokemonImage pokeId={POKEMON_DATA[s.pokes[1]]} name={s.pokes[1]} /><span style={{ fontSize: '14px', fontWeight: '500', whiteSpace: 'nowrap' }}>{s.pokes[1]}</span></div>
                                            </div>
                                        </td>
                                        <td style={{ fontSize: '15px', textAlign: 'center', verticalAlign: 'middle' }}>{s.count}</td>
                                        <td style={{ color: s.winRate >= 50 ? '#34C759' : '#FF3B30', fontWeight: 'bold', fontSize: '15px', borderRight: '1px dashed var(--divider)', textAlign: 'center', verticalAlign: 'middle' }}>{s.winRate.toFixed(0)}%</td>
                                        <td style={{ textAlign: 'center', padding: '8px 4px', verticalAlign: 'middle' }}>
                                            {s.bestBacks.slice(0, 2).map((back, i) => (
                                                <div key={back.name} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '2px', marginBottom: i === 0 && s.bestBacks.length > 1 ? '8px' : '0' }}>
                                                    <div style={{ display: 'flex', transform: 'scale(0.85)', transformOrigin: 'center', marginRight: '-6px' }}>
                                                        {back.pokes[0] && <PokemonImage pokeId={POKEMON_DATA[back.pokes[0]]} name={back.pokes[0]} />}
                                                        {back.pokes[1] && <PokemonImage pokeId={POKEMON_DATA[back.pokes[1]]} name={back.pokes[1]} />}
                                                    </div>
                                                    <span style={{ color: back.winRate >= 50 ? '#34C759' : '#FF3B30', fontWeight: 'bold', fontSize: '11px', whiteSpace: 'nowrap' }}>{back.count}回 ({back.winRate.toFixed(0)}%)</span>
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
                        <table style={{ width: '100%' }}>
                            <tbody>
                                {stats.myStatsArray.map((s) => (
                                    <tr key={s.name}>
                                        <td className="poke-cell" style={{ width: '35%' }}><PokemonImage pokeId={s.id} name={s.name} />{s.name}</td>
                                        <td style={{ width: '65%', textAlign: 'left', paddingRight: '12px' }}>
                                            <div style={{ fontSize: '12px', color: '#5f6368', marginBottom: '2px' }}>{s.count}回 ({stats.totalMatches > 0 ? ((s.count / stats.totalMatches) * 100).toFixed(0) : 0}%)</div>
                                            <div className="bar-wrap"><div className="bar-inner" style={{ width: `${(s.count / stats.totalMatches) * 100}%` }}></div></div>
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