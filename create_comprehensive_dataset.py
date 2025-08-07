#!/usr/bin/env python3
"""
Comprehensive script to capture ALL 500+ players from DynastyProcess data
This will expand both our players.json and adp.json files
"""

import csv
import json
import math
import re

def clean_name(name):
    """Clean player names for better matching"""
    # Remove suffixes and clean formatting
    cleaned = name.strip()
    cleaned = re.sub(r'\s+(Jr\.?|Sr\.?|III|II)$', '', cleaned)
    cleaned = re.sub(r"['']", "'", cleaned)  # Normalize apostrophes
    cleaned = re.sub(r'[^\w\s\'-]', '', cleaned)  # Remove special chars except apostrophes and hyphens
    return cleaned

def convert_ecr_to_round_pick(ecr_rank):
    """Convert overall ECR ranking to round and pick within round (12-team league)"""
    overall_pick = math.ceil(ecr_rank)
    round_num = math.ceil(overall_pick / 12)
    pick_in_round = ((overall_pick - 1) % 12) + 1
    return round_num, pick_in_round

def extract_all_players_from_dynastyprocess():
    """Extract ALL players from DynastyProcess redraft rankings"""
    
    print("🔍 Extracting all players from DynastyProcess data...")
    
    # Read the redraft rankings from the CSV
    all_players = {}
    redraft_adp = {}
    
    with open('dynastyprocess-data/files/db_fpecr_latest.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['page_type'] == 'redraft-overall' and row['ecr_type'] == 'ro':
                dynasty_id = row['id']
                player_name = clean_name(row['player'])
                position = row['pos']
                team = row['team']
                ecr = float(row['ecr'])
                
                # Convert ECR to round/pick
                round_num, pick = convert_ecr_to_round_pick(ecr)
                
                # Store player info
                all_players[dynasty_id] = {
                    'name': player_name,
                    'position': position,
                    'team': team,
                    'ecr': ecr
                }
                
                # Store ADP info
                redraft_adp[dynasty_id] = {
                    'round': round_num,
                    'pick': pick
                }
    
    print(f"✅ Found {len(all_players)} players in DynastyProcess redraft rankings")
    return all_players, redraft_adp

def map_teams(dynasty_team):
    """Map DynastyProcess team abbreviations to our format"""
    team_mapping = {
        'ARI': 'Arizona Cardinals',
        'ATL': 'Atlanta Falcons', 
        'BAL': 'Baltimore Ravens',
        'BUF': 'Buffalo Bills',
        'CAR': 'Carolina Panthers',
        'CHI': 'Chicago Bears',
        'CIN': 'Cincinnati Bengals',
        'CLE': 'Cleveland Browns',
        'DAL': 'Dallas Cowboys',
        'DEN': 'Denver Broncos',
        'DET': 'Detroit Lions',
        'GB': 'Green Bay Packers',
        'GBP': 'Green Bay Packers',
        'HOU': 'Houston Texans',
        'IND': 'Indianapolis Colts',
        'JAC': 'Jacksonville Jaguars',
        'KC': 'Kansas City Chiefs',
        'KCC': 'Kansas City Chiefs',
        'LV': 'Las Vegas Raiders',
        'LVR': 'Las Vegas Raiders',
        'LAC': 'Los Angeles Chargers',
        'LAR': 'Los Angeles Rams',
        'MIA': 'Miami Dolphins',
        'MIN': 'Minnesota Vikings',
        'NE': 'New England Patriots',
        'NO': 'New Orleans Saints',
        'NOS': 'New Orleans Saints',
        'NYG': 'New York Giants',
        'NYJ': 'New York Jets',
        'PHI': 'Philadelphia Eagles',
        'PIT': 'Pittsburgh Steelers',
        'SF': 'San Francisco 49ers',
        'SFO': 'San Francisco 49ers',
        'SEA': 'Seattle Seahawks',
        'TB': 'Tampa Bay Buccaneers',
        'TBB': 'Tampa Bay Buccaneers',
        'TEN': 'Tennessee Titans',
        'WAS': 'Washington Commanders'
    }
    return team_mapping.get(dynasty_team, dynasty_team)

def create_comprehensive_dataset():
    """Create comprehensive player and ADP datasets"""
    
    # Get all DynastyProcess players
    dynasty_players, dynasty_adp = extract_all_players_from_dynastyprocess()
    
    # Load existing players to preserve our IDs where possible
    try:
        with open('src/data/players.json', 'r') as f:
            existing_players = json.load(f)
        print(f"📋 Loaded {len(existing_players)} existing players")
    except:
        existing_players = []
        print("📋 No existing players file found, starting fresh")
    
    # Create name-to-id mapping for existing players
    existing_name_to_id = {}
    for player in existing_players:
        clean_existing = clean_name(player['name']).lower()
        existing_name_to_id[clean_existing] = player['id']
    
    # Create new comprehensive datasets
    new_players = []
    new_adp = {}
    next_id = 5000000  # Start new IDs from 5M to avoid conflicts
    
    matched_existing = 0
    created_new = 0
    
    print("🔄 Processing all players...")
    
    for dynasty_id, dynasty_data in dynasty_players.items():
        player_name = dynasty_data['name']
        clean_dynasty_name = clean_name(player_name).lower()
        
        # Try to find existing player ID
        player_id = None
        if clean_dynasty_name in existing_name_to_id:
            player_id = existing_name_to_id[clean_dynasty_name]
            matched_existing += 1
        else:
            # Create new player ID
            player_id = str(next_id)
            next_id += 1
            created_new += 1
        
        # Add to players list
        new_players.append({
            'id': player_id,
            'name': player_name,
            'team': map_teams(dynasty_data['team']),
            'position': dynasty_data['position']
        })
        
        # Add to ADP mapping
        if dynasty_id in dynasty_adp:
            new_adp[player_id] = dynasty_adp[dynasty_id]
        
        if (matched_existing + created_new) % 50 == 0:
            print(f"  Processed {matched_existing + created_new} players...")
    
    print(f"✅ Matched {matched_existing} existing players")
    print(f"✅ Created {created_new} new players")
    print(f"✅ Total players: {len(new_players)}")
    
    # Sort players by position and name
    def sort_key(player):
        pos_order = {'QB': 1, 'RB': 2, 'WR': 3, 'TE': 4, 'DST': 5, 'K': 6}
        return (pos_order.get(player['position'], 99), player['name'])
    
    new_players.sort(key=sort_key)
    
    # Write updated files
    print("💾 Saving updated datasets...")
    
    with open('src/data/players.json', 'w') as f:
        json.dump(new_players, f, indent=2)
    
    with open('src/data/adp.json', 'w') as f:
        json.dump(new_adp, f, indent=2)
    
    print(f"🎉 Successfully created comprehensive dataset!")
    print(f"📊 Players: {len(new_players)} (was {len(existing_players)})")
    print(f"📊 ADP entries: {len(new_adp)}")
    
    # Show some stats by position
    pos_counts = {}
    for player in new_players:
        pos = player['position']
        pos_counts[pos] = pos_counts.get(pos, 0) + 1
    
    print("\n📈 Players by position:")
    for pos, count in sorted(pos_counts.items()):
        print(f"  {pos}: {count}")

if __name__ == "__main__":
    create_comprehensive_dataset()
