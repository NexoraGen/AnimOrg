# Task: Debug Search Page

- [x] Open http://localhost:8081/search (or http://localhost:8081/ if search fails)
- [x] Verify page loads
- [x] Click search input and type 'Naruto'
- [x] Wait for results
- [x] Capture screenshot
- [x] Get console logs
- [x] Analyze errors

## Findings
- AniList direct frontend request failed with 400 (Variable `$genres` is never used).
- Backend request to `http://127.0.0.1:5000/api/anime/search?q=Naruto...` failed with 504 (parsed as 500 in client).
- The page is showing "Retrying" and eventually fails.


