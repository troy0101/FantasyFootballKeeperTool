#!/usr/bin/env python3
"""
Script to update ADP data from DynastyProcess data to our format
Converts overall ECR (Expert Consensus Rankings) to round/pick format
"""

import csv
import json
import math

def convert_ecr_to_round_pick(ecr_rank):
    """Convert overall ECR ranking to round and pick within round (12-team league)"""
    overall_pick = math.ceil(ecr_rank)
    round_num = math.ceil(overall_pick / 12)
    pick_in_round = ((overall_pick - 1) % 12) + 1
    return round_num, pick_in_round

def update_adp_from_dynastyprocess():
    """Read DynastyProcess data and create updated ADP file"""
    
    # Read the redraft rankings from the CSV
    redraft_rankings = {}
    with open('dynastyprocess-data/files/db_fpecr_latest.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['page_type'] == 'redraft-overall' and row['ecr_type'] == 'ro':
                player_id = row['id']
                player_name = row['player']
                ecr = float(row['ecr'])
                
                # Convert ECR to round/pick
                round_num, pick = convert_ecr_to_round_pick(ecr)
                
                redraft_rankings[player_id] = {
                    'round': round_num,
                    'pick': pick,
                    'name': player_name,
                    'ecr': ecr
                }
    
    # Load our existing players data to match IDs
    with open('src/data/players.json', 'r') as f:
        players = json.load(f)
    
    # Create player ID mapping by name (rough matching)
    player_name_to_id = {}
    for player in players:
        # Create various name formats for matching
        full_name = player['name']
        player_name_to_id[full_name.lower()] = player['id']
        
        # Handle common name variations
        if " Jr." in full_name:
            player_name_to_id[full_name.replace(" Jr.", "").lower()] = player['id']
        if " III" in full_name:
            player_name_to_id[full_name.replace(" III", "").lower()] = player['id']
        if " II" in full_name:
            player_name_to_id[full_name.replace(" II", "").lower()] = player['id']
    
    # Create the new ADP data
    new_adp_data = {}
    matched_count = 0
    
    for dynasty_id, data in redraft_rankings.items():
        dynasty_name = data['name'].lower()
        
        # Try to find matching player in our dataset
        our_player_id = None
        
        # Direct name match
        if dynasty_name in player_name_to_id:
            our_player_id = player_name_to_id[dynasty_name]
        else:
            # Try some common variations
            variations = [
                dynasty_name.replace("'", ""),
                dynasty_name.replace(".", ""),
                dynasty_name.replace("-", " "),
            ]
            
            for variation in variations:
                if variation in player_name_to_id:
                    our_player_id = player_name_to_id[variation]
                    break
        
        if our_player_id:
            new_adp_data[our_player_id] = {
                'round': data['round'],
                'pick': data['pick']
            }
            matched_count += 1
            print(f"✓ Matched: {data['name']} -> {our_player_id} (Round {data['round']}, Pick {data['pick']})")
        else:
            print(f"✗ No match found for: {data['name']} (Dynasty ID: {dynasty_id})")
    
    # Write the updated ADP file
    with open('src/data/adp.json', 'w') as f:
        json.dump(new_adp_data, f, indent=2)
    
    print(f"\n🎉 Successfully updated ADP data!")
    print(f"📊 Matched {matched_count} players out of {len(redraft_rankings)} total")
    print(f"💾 Updated src/data/adp.json with current 2025 rankings")

if __name__ == "__main__":
    update_adp_from_dynastyprocess()
