import React, { useState } from 'react';
import { ScreenProps, StoreName } from '../types';
import { MOCK_HOT_DEALS, MOCK_BEST_DEALS, MOCK_MOST_WANTED, MOCK_RECENT_INFO } from '../data/mockData';
import { theme } from '../styles/theme';
import HotDealCard from '../components/HotDealCard';
import ThemedDealCard from '../components/ThemedDealCard';
import Card from '../components/Card';
import { styles } from '../styles/globalStyles';

const HomeScreen: React.FC<ScreenProps> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<StoreName>('Costco');
  const [activeThemedTab, setActiveThemedTab] = useState<'best' | 'popular'>('best');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = () => {
      if (searchQuery.trim()) {
          navigation('searchResults', { query: searchQuery.trim() });
      }
  };

  return (
    <div style={styles.screenScroll}>
      <div style={{...styles.screenContainer, paddingTop: theme.spacing.xl}}>
        {/* Header */}
        <header style={styles.header}>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
            <img src='https://i.pravatar.cc/40?u=user1' style={styles.avatar} alt="user avatar" />
            <div>
              <p style={{ color: theme.colors.textSecondary, margin:0 }}>Hello!</p>
              <p style={{...styles.h1, margin:0}}>Thrifty Shopper</p>
            </div>
          </div>
          <button style={{backgroundColor: 'transparent', border: 'none', position: 'relative', cursor: 'pointer'}}>
            <span style={{ fontSize: 24 }}>🔔</span>
            <div style={styles.notificationDot} />
          </button>
        </header>

        {/* Search Bar */}
        <div style={{position: 'relative', marginBottom: theme.spacing.xl}}>
          <span style={styles.searchIcon}>🔍</span>
          <input 
            type="text" 
            placeholder="Looking for a honey of a deal (product)?"
            style={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>

        {/* Hot Deals */}
        <section>
          <h2 style={styles.h2}>This Week's Hot Deals 🔥</h2>
          <div style={styles.hotDealTabs}>
            {(Object.keys(MOCK_HOT_DEALS) as StoreName[]).map(store => (
              <button key={store} onClick={() => setActiveTab(store)} style={{...styles.hotDealTab, ...(activeTab === store && styles.hotDealTabActive)}}>
                {store}
              </button>
            ))}
          </div>
        </section>
      </div>
      
      <div style={{ display: 'flex', overflowX: 'auto', padding: `0 ${theme.spacing.lg}px`, gap: theme.spacing.md, scrollbarWidth: 'none' }}>
        {MOCK_HOT_DEALS[activeTab].map((item, index) => <HotDealCard key={index} item={item} />)}
      </div>

      {/* Themed Picks Section */}
      <section style={{marginTop: theme.spacing.xl }}>
        <div style={styles.screenContainer}>
            <h2 style={styles.h2}>Bees' Recommended Picks! 🐝</h2>
            <div style={styles.hotDealTabs}>
                <button onClick={() => setActiveThemedTab('best')} style={{...styles.hotDealTab, ...(activeThemedTab === 'best' && styles.hotDealTabActive)}}>
                    BEST Honey Deals 🍯
                </button>
                <button onClick={() => setActiveThemedTab('popular')} style={{...styles.hotDealTab, ...(activeThemedTab === 'popular' && styles.hotDealTabActive)}}>
                    Most Carted Deals 🛒
                </button>
            </div>
        </div>
        <div style={{ display: 'flex', overflowX: 'auto', padding: `0 ${theme.spacing.lg}px 16px`, gap: theme.spacing.md, scrollbarWidth: 'none' }}>
            {(activeThemedTab === 'best' ? MOCK_BEST_DEALS : MOCK_MOST_WANTED).map(item => <ThemedDealCard key={item.id} item={item} />)}
        </div>
      </section>

      {/* Recent Info */}
      <section style={{...styles.screenContainer, marginTop: theme.spacing.md, paddingBottom: theme.spacing.xl }}>
        <h2 style={styles.h2}>Recently Added Info 🐝</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
          {MOCK_RECENT_INFO.map(item => (
            <button key={item.id} onClick={() => navigation('productDetail', { product: item })} style={{background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer'}}>
                <Card style={{ padding: theme.spacing.md, display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                    <img src={item.image} style={{ width: 40, height: 40, borderRadius: 8 }} alt={item.name}/>
                    <div>
                      <p style={{ fontWeight: theme.font.bold, margin: 0 }}>{item.name}</p>
                      <p style={{ fontSize: 12, color: theme.colors.textSecondary, margin: 0 }}>
                        Price registered by <span style={{ color: theme.colors.amber600, fontWeight: theme.font.semibold }}>{item.user}</span>
                      </p>
                    </div>
                  </div>
                  <p style={{ fontWeight: theme.font.bold, fontSize: 16, margin: 0 }}>{item.price}</p>
                </Card>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

export default HomeScreen;