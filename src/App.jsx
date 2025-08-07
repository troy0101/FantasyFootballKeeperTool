


import { useState, useEffect } from 'react';
import { Autocomplete, TextField, Typography, Box, Card, CardContent, Chip, MenuItem } from '@mui/material';
import './App.css';
import playersData from './data/players.json';
import adpData from './data/adp.json';

function App() {
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [leagueSize, setLeagueSize] = useState('');
  const [draftPosition, setDraftPosition] = useState('');
  const [keeperRound, setKeeperRound] = useState('');
  const [valueAnalysis, setValueAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [keeperGif, setKeeperGif] = useState(null);

  // Giphy API integration for keeper value memes
  const getKeeperGif = async (valueTier) => {
    const GIPHY_API_KEY = 'GlVGYHkr3WSBnllca02FAgDefFq38dRN'; // Public API key for demos
    let searchTerm = '';
    
    switch(valueTier) {
      case 'LEAGUE WINNER':
        searchTerm = 'fantasy football champion victory celebration';
        break;
      case 'ELITE':
        searchTerm = 'excellent amazing great job well done';
        break;
      case 'GREAT':
        searchTerm = 'good job thumbs up approval nice';
        break;
      case 'SOLID':
        searchTerm = 'okay not bad decent alright';
        break;
      case 'POOR':
        searchTerm = 'disappointed facepalm not good bad';
        break;
      case 'TERRIBLE':
        searchTerm = 'disaster fail terrible awful mistake';
        break;
      default:
        searchTerm = 'fantasy football draft pick';
    }

    try {
      const response = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(searchTerm)}&limit=10&rating=pg-13`
      );
      const data = await response.json();
      
      if (data.data && data.data.length > 0) {
        // Get a random gif from the results
        const randomIndex = Math.floor(Math.random() * data.data.length);
        const gif = data.data[randomIndex];
        setKeeperGif({
          url: gif.images.fixed_height.url,
          title: gif.title,
          width: gif.images.fixed_height.width,
          height: gif.images.fixed_height.height
        });
      }
    } catch (error) {
      console.error('Error fetching Giphy:', error);
      setKeeperGif(null);
    }
  };


  // Load players data on mount
  useEffect(() => {
    setLoading(true);
    setError('');
    try {
      setPlayers(
        playersData.map(p => ({
          id: p.id,
          name: p.name,
          team: p.team,
          position: p.position,
        }))
      );
    } catch (err) {
      setError('Failed to load player data');
    }
    setLoading(false);
  }, []);

  // Calculate keeper value whenever inputs change
  useEffect(() => {
    if (selectedPlayer && leagueSize && draftPosition && keeperRound) {
      calculateKeeperValue();
    } else {
      setValueAnalysis(null);
      setKeeperGif(null);
    }
  }, [selectedPlayer, leagueSize, draftPosition, keeperRound]);

  const calculateKeeperValue = () => {
    const playerAdp = adpData[selectedPlayer.id];
    if (!playerAdp) {
      setValueAnalysis({
        hasAdp: false,
        message: 'No ADP data available for this player'
      });
      return;
    }

    const leagueSizeNum = parseInt(leagueSize);
    const draftPos = parseInt(draftPosition);
    const keeperRoundNum = parseInt(keeperRound);

    // ESPN ADP is based on 12-team leagues, so we use 12 for ADP calculations
    // Your keeper pick uses your actual league size
    const adpPick = ((playerAdp.round - 1) * 12) + playerAdp.pick; // ESPN uses 12-team
    const keeperPick = ((keeperRoundNum - 1) * leagueSizeNum) + draftPos; // Your actual league
    
    // For comparison, convert both to same scale or use round-based comparison
    const roundDifference = playerAdp.round - keeperRoundNum; // Positive = ADP round > keeper round (GOOD!)
    
    // Convert to same league size for pick comparison
    const adpPickAdjusted = ((playerAdp.round - 1) * leagueSizeNum) + Math.round((playerAdp.pick * leagueSizeNum) / 12);
    const pickDifference = adpPickAdjusted - keeperPick; // Positive = getting player earlier than ADP (GOOD!)
    
    // Keeper value algorithm based on keeper round vs ESPN ADP round
    const calculateValueScore = () => {
      // Use absolute round difference as base, then apply logic for direction
      const absRoundDiff = Math.abs(roundDifference);
      let score = absRoundDiff * 12; // Base score: 12 points per round difference
      
      const adpRoundNum = playerAdp.round;
      
      // Debug logging
      console.log('DEBUG - Keeper Analysis:', {
        playerName: selectedPlayer.name,
        leagueSize: leagueSizeNum,
        draftPosition: draftPos,
        adpRound: adpRoundNum,
        adpPick: playerAdp.pick,
        keeperRound: keeperRoundNum,
        adpOverallPick: adpPick,
        keeperOverallPick: keeperPick,
        adpPickAdjusted: adpPickAdjusted,
        pickDifference: pickDifference,
        roundDifference: roundDifference,
        absRoundDiff: absRoundDiff,
        baseScore: score
      });
      
      // MAIN LOGIC: If roundDifference is POSITIVE, that means ADP round > keeper round = GOOD VALUE
      // Example: Chase Brown ADP Round 3, Keeper Round 7 → roundDifference = 3 - 7 = -4
      // But this should be GOOD! So we need to flip the logic
      
      if (roundDifference > 0) {
        // ADP round > keeper round = BAD (keeping early for late player)
        // Example: ADP Round 10, Keeper Round 3 = wasting early keeper
        score = -score; // Make negative for bad value
        const roundGap = roundDifference;
        
        if (roundGap >= 4) {
          score *= 3.0; // More negative = worse
        } else if (roundGap >= 3) {
          score *= 2.5; 
        } else if (roundGap >= 2) {
          score *= 2.0; 
        } else if (roundGap >= 1) {
          score *= 1.5; 
        }
        
      } else if (roundDifference < 0) {
        // ADP round < keeper round = GOOD (keeping late for early player)  
        // Example: ADP Round 3, Keeper Round 7 → roundDifference = -4 = EXCELLENT!
        // Score stays positive for good value
        const roundGap = absRoundDiff; // Already positive
        
        // ELITE PLAYER PREMIUM: Rounds 1-3 ADP get massive bonuses
        if (adpRoundNum <= 3) {
          if (roundGap >= 5) {
            score *= 4.0; // Elite player kept 5+ rounds later = league winner
          } else if (roundGap >= 4) {
            score *= 3.5; // Elite player kept 4+ rounds later = massive value
          } else if (roundGap >= 3) {
            score *= 3.0; // Elite player kept 3+ rounds later = excellent
          } else if (roundGap >= 2) {
            score *= 2.5; // Elite player kept 2+ rounds later = very good
          } else if (roundGap >= 1) {
            score *= 2.0; // Elite player kept 1+ round later = good
          }
          
          // Extra bonus for keeping elite players very late
          if (adpRoundNum === 1 && keeperRoundNum >= 6) {
            score *= 1.5; // 1st round talent in 6th+ round
          } else if (adpRoundNum <= 2 && keeperRoundNum >= 8) {
            score *= 1.3; // Top 2 round talent in 8th+ round
          }
        }
        // Mid-tier players (rounds 4-7) get moderate bonuses
        else if (adpRoundNum <= 7) {
          if (roundGap >= 4) {
            score *= 2.5; // Mid-tier kept 4+ rounds later
          } else if (roundGap >= 3) {
            score *= 2.0; // Mid-tier kept 3+ rounds later
          } else if (roundGap >= 2) {
            score *= 1.7; // Mid-tier kept 2+ rounds later
          } else if (roundGap >= 1) {
            score *= 1.4; // Mid-tier kept 1+ round later
          }
        }
        // Late round players (rounds 8+) get smaller bonuses
        else {
          if (roundGap >= 4) {
            score *= 1.8; // Late player kept very late
          } else if (roundGap >= 2) {
            score *= 1.5; // Late player kept somewhat late
          } else if (roundGap >= 1) {
            score *= 1.2; // Late player kept slightly late
          }
        }
        
        // Position-based adjustments
        const position = selectedPlayer.position;
        if (position === 'RB' || position === 'WR') {
          if (adpRoundNum <= 3) {
            score *= 1.2; // Extra premium for elite skill positions
          }
        } else if (position === 'QB') {
          score *= 0.9; // QBs slightly less valuable due to depth
        } else if (position === 'TE') {
          if (adpRoundNum <= 5) {
            score *= 1.1; // Premium TEs are valuable
          }
        }
        
      } else {
        // roundDifference === 0: Keeper round equals ADP round = neutral
        score *= 1.0;
      }
      
      // Kicker and Defense penalty
      if (selectedPlayer.position === 'K' || selectedPlayer.position === 'DST') {
        score *= 0.3; // Very poor keeper choices
      }
      
      console.log('DEBUG - Final Score:', score);
      return Math.round(score);
    };

    const valueScore = calculateValueScore();
    
    // Updated value tier system to accommodate new enhanced scoring
    let valueTier, valueColor, valueIcon, valueMessage;
    
    if (valueScore >= 60) {
      valueTier = 'LEAGUE WINNER';
      valueColor = '#0d47a1'; // Deep blue
      valueIcon = '👑';
      valueMessage = `LEAGUE WINNER! This is an absolute steal that could win your league.`;
    } else if (valueScore >= 36) {
      valueTier = 'ELITE';
      valueColor = '#1b5e20'; // Dark green
      valueIcon = '🔥';
      valueMessage = `ELITE value! This is a premium keeper choice.`;
    } else if (valueScore >= 24) {
      valueTier = 'EXCELLENT';
      valueColor = '#2e7d32'; // Green
      valueIcon = '⭐';
      valueMessage = `Excellent value! This keeper provides significant advantage.`;
    } else if (valueScore >= 12) {
      valueTier = 'GOOD';
      valueColor = '#388e3c'; // Light green
      valueIcon = '✅';
      valueMessage = `Good value! This keeper makes sense.`;
    } else if (valueScore >= 0) {
      valueTier = 'FAIR';
      valueColor = '#fbc02d'; // Yellow
      valueIcon = '⚖️';
      valueMessage = `Fair value. This keeper is roughly at market value.`;
    } else if (valueScore >= -18) {
      valueTier = 'POOR';
      valueColor = '#f57c00'; // Orange
      valueIcon = '⚠️';
      valueMessage = `Poor value. You can probably get this player later in the draft.`;
    } else {
      valueTier = 'TERRIBLE';
      valueColor = '#d32f2f'; // Red
      valueIcon = '❌';
      valueMessage = `Terrible value! You're wasting this keeper slot.`;
    }

    setValueAnalysis({
      hasAdp: true,
      playerName: selectedPlayer.name,
      playerTeam: selectedPlayer.team,
      playerPosition: selectedPlayer.position,
      leagueSize: leagueSizeNum,
      draftPosition: draftPos,
      espnAdpRound: playerAdp.round,
      espnAdpPick: playerAdp.pick,
      espnOverallPick: adpPick, // This is 12-team based
      espnOverallPickAdjusted: adpPickAdjusted, // This is your league size
      keeperOverallPick: keeperPick,
      pickValueDifference: pickDifference,
      roundDifference: roundDifference,
      valueScore: valueScore,
      valueTier: valueTier,
      valueColor: valueColor,
      valueIcon: valueIcon,
      isGoodValue: valueScore >= 12,
      valueMessage: valueMessage
    });
    
    // Fetch appropriate gif for the keeper value
    getKeeperGif(valueTier);
  };


  return (
    <Box className="keeper-app">
      <Typography variant="h4" align="center" gutterBottom>
        Fantasy Football Keeper Value Calculator
      </Typography>
      
      <Box className="keeper-form" sx={{ mb: 4 }}>
        <Autocomplete
          options={players}
          getOptionLabel={option => `${option.name} (${option.team} - ${option.position})`}
          value={selectedPlayer}
          onChange={(_, value) => setSelectedPlayer(value)}
          renderInput={params => (
            <TextField {...params} label="Search All Players for 2025" variant="outlined" />
          )}
          sx={{ mb: 3 }}
        />
        
        <TextField
          select
          label="League Size"
          value={leagueSize}
          onChange={e => {
            setLeagueSize(e.target.value);
            setDraftPosition(''); // Reset draft position when league size changes
          }}
          sx={{ mb: 3 }}
          fullWidth
        >
          <MenuItem value="8">8 Team League</MenuItem>
          <MenuItem value="10">10 Team League</MenuItem>
          <MenuItem value="12">12 Team League</MenuItem>
          <MenuItem value="14">14 Team League</MenuItem>
          <MenuItem value="16">16 Team League</MenuItem>
        </TextField>
        
        <TextField
          select
          label="Your Draft Position"
          value={draftPosition}
          onChange={e => setDraftPosition(e.target.value)}
          disabled={!leagueSize}
          sx={{ mb: 3 }}
          fullWidth
        >
          {leagueSize && Array.from({ length: parseInt(leagueSize) }, (_, i) => (
            <MenuItem key={i + 1} value={i + 1}>
              Pick {i + 1} of {leagueSize}
            </MenuItem>
          ))}
        </TextField>
        
        <TextField
          label="Keeper Round (What round you're keeping the player in)"
          type="number"
          value={keeperRound}
          onChange={e => setKeeperRound(e.target.value)}
          inputProps={{ min: 1, max: 15 }}
          sx={{ mb: 3 }}
          fullWidth
          helperText="Enter the round where you'll use your keeper slot"
        />
      </Box>

      {valueAnalysis && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            {valueAnalysis.hasAdp ? (
              <>
                {/* Player Header */}
                <Box sx={{ mb: 3, textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                    {valueAnalysis.playerName}
                  </Typography>
                  <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                    {valueAnalysis.playerTeam} - {valueAnalysis.playerPosition}
                  </Typography>
                </Box>

                {/* ADP vs Keeper Comparison - Side by Side */}
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, 
                  gap: 3, 
                  mb: 4 
                }}>
                  {/* ESPN ADP Box */}
                  <Box sx={{ 
                    p: 3,
                    bgcolor: '#1976d2',
                    color: 'white',
                    borderRadius: 3,
                    textAlign: 'center',
                    boxShadow: 3
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1, gap: 1 }}>
                      <img 
                        src="https://logos-world.net/wp-content/uploads/2021/08/ESPN-Symbol.png" 
                        alt="ESPN Logo" 
                        style={{ 
                          height: '24px', 
                          width: 'auto',
                          filter: 'brightness(0) invert(1)' // Makes logo white
                        }} 
                      />
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        ESPN ADP
                      </Typography>
                    </Box>
                    <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                      Round {valueAnalysis.espnAdpRound}
                    </Typography>
                    <Typography variant="h5" sx={{ mb: 1 }}>
                      Pick {valueAnalysis.espnAdpPick}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      Overall Pick #{valueAnalysis.espnOverallPick} (12-team)
                    </Typography>
                  </Box>

                  {/* Your Keeper Box */}
                  <Box sx={{ 
                    p: 3,
                    bgcolor: '#7b1fa2',
                    color: 'white',
                    borderRadius: 3,
                    textAlign: 'center',
                    boxShadow: 3
                  }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                      🎯 Your Keeper
                    </Typography>
                    <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                      Round {keeperRound}
                    </Typography>
                    <Typography variant="h5" sx={{ mb: 1 }}>
                      Pick {draftPosition}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      Overall Pick #{valueAnalysis.keeperOverallPick} ({valueAnalysis.leagueSize}-team)
                    </Typography>
                  </Box>
                </Box>

                {/* Value Indicator Arrow */}
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                  {valueAnalysis.roundDifference < 0 ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                      <Typography variant="h4">📈</Typography>
                      <Typography variant="h6" color="success.main" sx={{ fontWeight: 'bold' }}>
                        {Math.abs(valueAnalysis.roundDifference)} Round{Math.abs(valueAnalysis.roundDifference) > 1 ? 's' : ''} of VALUE!
                      </Typography>
                      <Typography variant="h4">🎉</Typography>
                    </Box>
                  ) : valueAnalysis.roundDifference > 0 ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                      <Typography variant="h4">📉</Typography>
                      <Typography variant="h6" color="error.main" sx={{ fontWeight: 'bold' }}>
                        {valueAnalysis.roundDifference} Round{valueAnalysis.roundDifference > 1 ? 's' : ''} WASTED
                      </Typography>
                      <Typography variant="h4">😬</Typography>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                      <Typography variant="h4">⚖️</Typography>
                      <Typography variant="h6" color="warning.main" sx={{ fontWeight: 'bold' }}>
                        Fair Market Value
                      </Typography>
                    </Box>
                  )}
                </Box>

                {/* Value Score Banner with GIF */}
                <Box sx={{ 
                  p: 4, 
                  mb: 3,
                  backgroundColor: valueAnalysis.valueColor,
                  color: 'white',
                  borderRadius: 3,
                  textAlign: 'center',
                  boxShadow: 4
                }}>
                  <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 2 }}>
                    {valueAnalysis.valueIcon} {valueAnalysis.valueTier}
                  </Typography>
                  <Typography variant="h5" sx={{ mb: 3, opacity: 0.9 }}>
                    Value Score: {valueAnalysis.valueScore > 0 ? '+' : ''}{valueAnalysis.valueScore}
                  </Typography>
                  
                  {/* Keeper Reaction GIF - Centered and Prominent */}
                  {keeperGif && (
                    <Box sx={{ 
                      mb: 3,
                      display: 'flex', 
                      justifyContent: 'center',
                      '& img': {
                        maxWidth: '350px',
                        maxHeight: '250px',
                        borderRadius: 3,
                        boxShadow: 3,
                        border: '3px solid rgba(255,255,255,0.3)'
                      }
                    }}>
                      <img 
                        src={keeperGif.url} 
                        alt={keeperGif.title || 'Keeper reaction'} 
                        style={{ objectFit: 'contain' }}
                      />
                    </Box>
                  )}

                  <Typography variant="h6" sx={{ fontWeight: 'bold', lineHeight: 1.4 }}>
                    {valueAnalysis.valueMessage}
                  </Typography>
                </Box>

                {/* Detailed Breakdown */}
                <Box sx={{ 
                  p: 3, 
                  bgcolor: '#f8f9fa', 
                  borderRadius: 2,
                  border: `3px solid ${valueAnalysis.valueColor}`
                }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3, color: valueAnalysis.valueColor }}>
                    📋 Detailed Analysis
                  </Typography>
                  
                  {/* Key Metrics Grid */}
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, 
                    gap: 2, 
                    mb: 3 
                  }}>
                    <Box sx={{ 
                      p: 2, 
                      bgcolor: 'white', 
                      borderRadius: 2, 
                      textAlign: 'center',
                      border: '1px solid #e0e0e0'
                    }}>
                      <Typography variant="body2" color="text.secondary">Pick Difference</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', color: valueAnalysis.pickValueDifference <= 0 ? 'success.main' : 'error.main' }}>
                        {valueAnalysis.pickValueDifference > 0 ? '+' : ''}{valueAnalysis.pickValueDifference} picks
                      </Typography>
                    </Box>
                    <Box sx={{ 
                      p: 2, 
                      bgcolor: 'white', 
                      borderRadius: 2, 
                      textAlign: 'center',
                      border: '1px solid #e0e0e0'
                    }}>
                      <Typography variant="body2" color="text.secondary">Round Gap</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', color: valueAnalysis.roundDifference <= 0 ? 'success.main' : 'error.main' }}>
                        {valueAnalysis.roundDifference > 0 ? '+' : ''}{valueAnalysis.roundDifference} rounds
                      </Typography>
                    </Box>
                  </Box>

                  {/* Contextual Messages */}
                  <Box sx={{ mb: 2 }}>
                    {valueAnalysis.roundDifference <= -4 && (
                      <Box sx={{ p: 2, bgcolor: '#e8f5e8', borderRadius: 2, mb: 2, border: '1px solid #4caf50' }}>
                        <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                          🚀 MASSIVE VALUE: Using Round {keeperRound} keeper for Round {valueAnalysis.espnAdpRound} ADP player!
                        </Typography>
                      </Box>
                    )}
                    
                    {valueAnalysis.roundDifference <= -3 && valueAnalysis.roundDifference > -4 && (
                      <Box sx={{ p: 2, bgcolor: '#e8f5e8', borderRadius: 2, mb: 2, border: '1px solid #66bb6a' }}>
                        <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#388e3c' }}>
                          🎯 EXCELLENT VALUE: Using Round {keeperRound} keeper for Round {valueAnalysis.espnAdpRound} ADP player!
                        </Typography>
                      </Box>
                    )}
                    
                    {valueAnalysis.roundDifference <= -1 && valueAnalysis.roundDifference > -3 && (
                      <Box sx={{ p: 2, bgcolor: '#e8f5e8', borderRadius: 2, mb: 2, border: '1px solid #81c784' }}>
                        <Typography variant="body1" sx={{ color: '#4caf50' }}>
                          ✅ GOOD VALUE: Using Round {keeperRound} keeper for Round {valueAnalysis.espnAdpRound} ADP player
                        </Typography>
                      </Box>
                    )}
                    
                    {valueAnalysis.espnAdpRound <= 3 && parseInt(keeperRound) >= 7 && (
                      <Box sx={{ p: 2, bgcolor: '#e3f2fd', borderRadius: 2, mb: 2, border: '1px solid #2196f3' }}>
                        <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#1565c0' }}>
                          👑 LEAGUE WINNER: Early round talent secured with late keeper slot!
                        </Typography>
                      </Box>
                    )}
                    
                    {valueAnalysis.roundDifference > 0 && (
                      <Box sx={{ p: 2, bgcolor: '#fff3e0', borderRadius: 2, mb: 2, border: '1px solid #ff9800' }}>
                        <Typography variant="body1" sx={{ color: '#f57c00' }}>
                          ⚠️ POOR VALUE: Using early keeper (Round {keeperRound}) for late ADP player (Round {valueAnalysis.espnAdpRound})
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  {/* Position-specific advice */}
                  {(selectedPlayer.position === 'K' || selectedPlayer.position === 'DST') && valueAnalysis.pickValueDifference > 0 && (
                    <Box sx={{ p: 2, bgcolor: '#fff8e1', borderRadius: 2, mb: 2, border: '1px solid #ffc107' }}>
                      <Typography variant="body2" sx={{ color: '#f57c00' }}>
                        ⚠️ Consider: {selectedPlayer.position}s are typically not optimal keeper choices
                      </Typography>
                    </Box>
                  )}
                  
                  {selectedPlayer.position === 'QB' && valueAnalysis.pickValueDifference > 0 && (
                    <Box sx={{ p: 2, bgcolor: '#e3f2fd', borderRadius: 2, mb: 2, border: '1px solid #2196f3' }}>
                      <Typography variant="body2" sx={{ color: '#1976d2' }}>
                        🏈 QB Note: Good value but consider RB/WR depth at this ADP
                      </Typography>
                    </Box>
                  )}
                </Box>
              </>
            ) : (
              <Box sx={{ 
                p: 4, 
                bgcolor: '#fff3cd', 
                borderRadius: 3,
                border: '2px solid #ffc107',
                textAlign: 'center'
              }}>
                <Typography variant="h6" color="warning.main" sx={{ fontWeight: 'bold' }}>
                  ⚠️ {valueAnalysis.message}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {error && (
        <Typography color="error" sx={{ mt: 2 }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}

export default App;
