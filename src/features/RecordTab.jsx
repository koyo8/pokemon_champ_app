import { useState, useEffect, useMemo, useCallback } from 'react';
import { POKE_BY_ID, fullPokeList } from '../data/pokemon';
import { PokemonImage } from '../components/PokemonImage';

export function RecordTab({
    recordSeason, setRecordSeason, isSeasonEditing, setIsSeasonEditing,
    isSeasonDropdownOpen, setIsSeasonDropdownOpen, availableSeasons,
    selectedIds, setSelectedIds, handleToggleOpp6, searchText, setSearchText,
    suggestedIds, oppPickedIds, handleToggleOppPick, isLoading,
    myPartyIds, setMyPartyIds, myPartyList, myPickedIds, handleToggleMyPick, setMyPickedIds,
    matchResult, setMatchResult, handleSave, isSaving, showToast
}) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalSearchText, setModalSearchText] = useState("");
    const [debouncedModalSearchText, setDebouncedModalSearchText] = useState("");
    const [tempMyPartyIds, setTempMyPartyIds] = useState([]);

    const [debouncedSearchText, setDebouncedSearchText] = useState("");

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearchText(searchText), 300);
        return () => clearTimeout(timer);
    }, [searchText]);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedModalSearchText(modalSearchText), 300);
        return () => clearTimeout(timer);
    }, [modalSearchText]);

    const filteredPokeList = useMemo(() => 
        fullPokeList.filter(poke => poke.name.includes(debouncedSearchText) || poke.hira.includes(debouncedSearchText)), 
    [debouncedSearchText]);

    const filteredModalPokeList = useMemo(() => 
        fullPokeList.filter(poke => poke.name.includes(debouncedModalSearchText) || poke.hira.includes(debouncedModalSearchText)), 
    [debouncedModalSearchText]);

    // ★ 内部モーダル用の処理も完全関数型更新に書き換えて連打対策
    const handleToggleModalPick = useCallback((id) => {
        setTempMyPartyIds(prev => {
            const isCurrentlySelected = prev.includes(id);
            if (isCurrentlySelected) {
                return prev.filter(i => i !== id);
            } else {
                if (prev.length >= 6) {
                    showToast("選べるのは6匹までです");
                    return prev;
                }
                setModalSearchText("");
                return [...prev, id];
            }
        });
    }, [showToast]);

    const handleSaveModal = () => {
        if (tempMyPartyIds.length !== 6) return showToast("自分のパーティを6匹選んでください");
        setMyPartyIds(tempMyPartyIds);
        localStorage.setItem('my_vgc_party', JSON.stringify(tempMyPartyIds));
        setMyPickedIds(prev => prev.filter(id => tempMyPartyIds.includes(id)));
        setIsModalOpen(false);
        showToast("パーティを更新しました", "success");
    };

    const tapOptimizedStyle = {
        touchAction: 'manipulation',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none'
    };

    const renderButton = (poke, list, toggleFunc, styleClass, iconOnly = false) => {
        const isSelected = list.includes(poke.id);
        return (
            <button 
                key={poke.name} 
                className={`poke-btn ${isSelected ? styleClass : ''} ${iconOnly ? 'icon-only' : ''}`} 
                onClick={(e) => { e.currentTarget.blur(); toggleFunc(poke.id); }} // ★ 修正: id だけを渡す
                aria-pressed={isSelected} 
                title={poke.name}
                style={tapOptimizedStyle}
            >
                <PokemonImage pokeId={poke.id} name={poke.name} />
                {!iconOnly && <span>{poke.name}</span>}
            </button>
        );
    };

    const renderPickButton = (poke, pickedList, toggleFunc, styleClass, isOpp) => {
        const selectedIndex = pickedList.indexOf(poke.id);
        const isSelected = selectedIndex !== -1;
        let badgeClass = isSelected ? (isOpp ? (selectedIndex < 2 ? 'opp-lead' : 'opp-back') : (selectedIndex < 2 ? 'my-lead' : 'my-back')) : '';

        return (
            <button 
                key={poke.name} 
                className={`poke-btn ${isSelected ? styleClass : ''}`} 
                onClick={(e) => { e.currentTarget.blur(); toggleFunc(poke.id); }} // ★ 修正: id だけを渡す
                aria-pressed={isSelected}
                style={tapOptimizedStyle}
            >
                <div className={`pick-badge ${badgeClass}`} style={{ opacity: isSelected ? 1 : 0, visibility: isSelected ? 'visible' : 'hidden' }}>{isSelected ? selectedIndex + 1 : ''}</div>
                <PokemonImage pokeId={poke.id} name={poke.name} />{poke.name}
            </button>
        );
    };

    return (
        <div role="tabpanel">
            {/* シーズン管理 */}
            <div className="md-card" style={{ padding: '16px 20px', marginBottom: '24px' }}>
                <div className="section-header" style={{ marginBottom: '12px' }}>
                    <h3 style={{ margin: 0 }}>記録するシーズン</h3>
                    <button className="edit-btn" onClick={() => { if (isSeasonEditing) localStorage.setItem('vgc_season', recordSeason); setIsSeasonEditing(!isSeasonEditing); }} style={{ backgroundColor: isSeasonEditing ? '#1A73E8' : 'var(--divider)', color: isSeasonEditing ? 'white' : 'var(--text-sub)' }}>
                        {isSeasonEditing ? "確定する" : "変更する"}
                    </button>
                </div>
                <div style={{ position: 'relative' }}>
                    <input 
                        type="text" 
                        className="search-box" 
                        placeholder={isSeasonEditing ? "例: シーズン19" : "シーズン未設定"} 
                        value={recordSeason} 
                        onChange={(e) => setRecordSeason(e.target.value)} 
                        disabled={!isSeasonEditing} 
                        onFocus={() => { if (isSeasonEditing) setIsSeasonDropdownOpen(true); }} 
                        onBlur={() => setTimeout(() => setIsSeasonDropdownOpen(false), 200)} 
                        style={{ 
                            margin: 0, backgroundColor: isSeasonEditing ? '#FFFFFF' : 'var(--app-bg)', 
                            border: isSeasonEditing ? '2px solid #1A73E8' : '2px solid transparent', 
                            color: '#000000', WebkitTextFillColor: '#000000', opacity: 1, 
                            fontWeight: isSeasonEditing ? 'normal' : 'bold' 
                        }} 
                    />
                    {isSeasonEditing && isSeasonDropdownOpen && availableSeasons.length > 0 && (
                        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, backgroundColor: 'var(--card-bg)', border: '1px solid var(--divider)', borderRadius: '12px', boxShadow: 'var(--shadow-md)', zIndex: 2000, maxHeight: '160px', overflowY: 'auto', padding: '4px' }}>
                            {availableSeasons.map((s, idx) => (
                                <div 
                                    key={idx} 
                                    style={{ padding: '12px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', color: '#000000', backgroundColor: recordSeason === s ? 'var(--primary-light)' : 'transparent' }} 
                                    onMouseDown={(e) => { e.preventDefault(); setRecordSeason(s); localStorage.setItem('vgc_season', s); setIsSeasonDropdownOpen(false); }}
                                >
                                    {s}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                {!isSeasonEditing && recordSeason === "" && <div style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '8px' }}>※「変更する」を押してシーズンを入力してください</div>}
            </div>
            
            {/* 相手パーティ選択 */}
            <h2>相手のパーティを選択（{selectedIds.length} / 6匹）</h2>
            <div className="md-card">
                <div style={{
                    minHeight: selectedIds.length === 0 ? '52px' : 'auto',
                    backgroundColor: selectedIds.length === 0 ? 'var(--app-bg)' : 'transparent',
                    borderRadius: '8px',
                    border: selectedIds.length === 0 ? '2px dashed var(--divider)' : 'none',
                    marginBottom: selectedIds.length === 6 ? '0' : '16px',
                    display: selectedIds.length === 0 ? 'flex' : 'block',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    {selectedIds.length > 0 && (
                        <div className="poke-container" style={{ gap: '10px' }}>
                            {selectedIds.map(id => POKE_BY_ID[id]).filter(Boolean).map(poke => renderButton(poke, selectedIds, handleToggleOpp6, 'selected-opp', true))}
                        </div>
                    )}
                </div>

                {selectedIds.length < 6 && (
                    isLoading ? (
                        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-sub)', fontSize: '14px', fontWeight: 'bold' }}>データを読み込み中...</div>
                    ) : (
                        <>
                            <input type="text" className="search-box" placeholder="検索..." value={searchText} onChange={(e) => setSearchText(e.target.value)} style={{ marginBottom: '12px' }} />
                            
                            <div style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
                                
                                {searchText === "" && suggestedIds.suggested.length > 0 && (
                                    <div style={{ flexShrink: 0, marginBottom: '8px' }}>
                                        <h4 style={{ fontSize: '13px', color: 'var(--text-sub)', marginBottom: '12px', marginTop: '0' }}>
                                            {selectedIds.length === 0 ? "よく遭遇するポケモン" : "一緒によくいるポケモン"}
                                        </h4>
                                        <div className="poke-container" style={{ gap: '10px' }}>
                                            {suggestedIds.suggested.map(id => POKE_BY_ID[id]).filter(Boolean).map(poke => renderButton(poke, selectedIds, handleToggleOpp6, 'selected-opp', true))}
                                        </div>
                                        <hr style={{ border: 'none', borderTop: '1px solid var(--divider)', margin: '16px 0 8px 0' }} />
                                    </div>
                                )}

                                <div style={{ flexGrow: 1, overflowY: 'auto', paddingRight: '4px' }}>
                                    <div className="search-result-container" style={{ margin: 0 }}>
                                        {searchText === "" ? (
                                            fullPokeList.filter(poke => !suggestedIds.suggested.includes(poke.id) && !selectedIds.includes(poke.id)).map(poke => renderButton(poke, selectedIds, handleToggleOpp6, 'selected-opp', false))
                                        ) : (
                                            filteredPokeList.map(poke => renderButton(poke, selectedIds, handleToggleOpp6, 'selected-opp', false))
                                        )}
                                    </div>
                                </div>

                            </div>
                        </>
                    )
                )}
            </div>

            {/* 選出と結果の記録 */}
            <h2>選出と結果を記録</h2>
            <div className="md-card">
                <h3>相手の選出</h3>
                <div className="poke-container" style={{ marginTop: '12px' }}>
                    {selectedIds.map(id => POKE_BY_ID[id]).filter(Boolean).map(poke => renderPickButton(poke, oppPickedIds, handleToggleOppPick, 'selected-opp', true))}
                    {Array.from({ length: Math.max(0, 6 - selectedIds.length) }).map((_, i) => (
                        <div key={`filler-opp-${i}`} style={{ visibility: 'hidden', pointerEvents: 'none' }} className="poke-btn"></div>
                    ))}
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--divider)', margin: '24px 0' }} />

                <div className="section-header">
                    <h3>自分の選出</h3>
                    <button className="edit-btn" onClick={() => { setTempMyPartyIds([...myPartyIds]); setModalSearchText(""); setIsModalOpen(true); }}>編集</button>
                </div>
                <div className="poke-container">
                    {myPartyList.length === 0 ? (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-sub)', fontSize: '13px', padding: '20px 0' }}>
                            編集ボタンからパーティを登録してください
                        </div>
                    ) : (
                        <>
                            {myPartyList.map(poke => renderPickButton(poke, myPickedIds, handleToggleMyPick, 'selected-my', false))}
                            {Array.from({ length: Math.max(0, 6 - myPartyList.length) }).map((_, i) => (
                                <div key={`filler-my-${i}`} style={{ visibility: 'hidden', pointerEvents: 'none' }} className="poke-btn"></div>
                            ))}
                        </>
                    )}
                </div>
            </div>

            <div className="result-container" role="group" aria-label="勝敗選択" style={{ marginBottom: '24px' }}>
                <button className={`result-btn win ${matchResult === '勝ち' ? 'selected' : ''}`} onClick={() => setMatchResult('勝ち')}>勝ち</button>
                <button className={`result-btn lose ${matchResult === '負け' ? 'selected' : ''}`} onClick={() => setMatchResult('負け')}>負け</button>
            </div>

            <button className="save-btn" onClick={handleSave} disabled={isSaving}>{isSaving ? "保存中..." : "記録を保存する"}</button>

            {/* モーダル */}
            {isModalOpen && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>自分のパーティ編集 ({tempMyPartyIds.length}/6)</h3>
                            <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>×</button>
                        </div>
                        <div className="modal-fixed-area" style={{ paddingBottom: '16px' }}>
                            <div className="poke-container" style={{ minHeight: '104px', alignContent: 'flex-start', marginBottom: '16px' }}>
                                {tempMyPartyIds.map(id => POKE_BY_ID[id]).filter(Boolean).map(poke => renderButton(poke, tempMyPartyIds, handleToggleModalPick, 'selected-my'))}
                            </div>
                            <input type="text" className="search-box" placeholder="検索して追加..." value={modalSearchText} onChange={(e) => setModalSearchText(e.target.value)} style={{ margin: 0 }} />
                        </div>
                        <div className="modal-body">
                            <div className="search-result-container" style={{ maxHeight: 'none', overflowY: 'visible', margin: 0, padding: 0 }}>
                                {filteredModalPokeList.map(poke => renderButton(poke, tempMyPartyIds, handleToggleModalPick, 'selected-my'))}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="save-btn" onClick={handleSaveModal}>パーティを確定する</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}