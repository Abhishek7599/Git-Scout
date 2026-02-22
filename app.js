const API = "https://api.github.com/users";
        let currentRepos = [];
        let recentSearches = JSON.parse(localStorage.getItem('gitScout_recent') || '[]');

        const searchForm = document.getElementById('searchForm');
        const usernameInput = document.getElementById('usernameInput');
        const repoFilter = document.getElementById('repoFilter');
        const repoSort = document.getElementById('repoSort');
        const themeToggle = document.getElementById('themeToggle');

        function initTheme() {
            const savedTheme = localStorage.getItem('gitScout_theme');
            if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        }

        themeToggle.addEventListener('click', () => {
            const isDark = document.documentElement.classList.toggle('dark');
            localStorage.setItem('gitScout_theme', isDark ? 'dark' : 'light');
        });

        window.onload = () => {
            initTheme();
            renderSuggested();
            renderRecent();
            const lastSearch = localStorage.getItem('gitScout_lastSearch');
            if(lastSearch) quickSearch(lastSearch);
        };

        async function performSearch(username) {
            if (!username) return;
            setUIState('loading');
            try {
                const startTime = Date.now();
                const userRes = await fetch(`${API}/${username}`);
                if (!userRes.ok) throw new Error(userRes.status === 404 ? "Ghost user detected" : "Network disturbance");
                const userData = await userRes.json();

                const repoRes = await fetch(`${API}/${username}/repos?per_page=100&sort=updated`);
                currentRepos = await repoRes.json();

                const elapsed = Date.now() - startTime;
                if(elapsed < 600) await new Promise(r => setTimeout(r, 600 - elapsed));

                renderProfile(userData);
                handleRepoUpdate();
                setUIState('success');
                saveSearch(username);
            } catch (err) {
                setUIState('error', err.message);
            }
        }

        function handleRepoUpdate() {
            const query = repoFilter.value.toLowerCase();
            const sortBy = repoSort.value;
            let filtered = currentRepos.filter(r => r.name.toLowerCase().includes(query));
            
            if (sortBy === 'stars') filtered.sort((a,b) => b.stargazers_count - a.stargazers_count);
            else if (sortBy === 'name') filtered.sort((a,b) => a.name.localeCompare(b.name));
            else filtered.sort((a,b) => new Date(b.updated_at) - new Date(a.updated_at));

            renderRepos(filtered.slice(0, 12));
        }

        function renderRepos(repos) {
            const list = document.getElementById('repoList');
            const empty = document.getElementById('noReposState');
            list.innerHTML = '';
            
            if (repos.length === 0) {
                empty.classList.remove('hidden');
                return;
            }
            empty.classList.add('hidden');

            repos.forEach((repo, idx) => {
                const div = document.createElement('div');
                div.className = "repo-card bg-white dark:bg-dark-card p-6 rounded-[2rem] border border-slate-100 dark:border-dark-border cursor-pointer animate-slide-up group";
                div.style.animationDelay = `${idx * 0.05}s`;
                div.onclick = () => openModal(repo);
                
                const langColor = {
                    'JavaScript': 'bg-yellow-400',
                    'TypeScript': 'bg-blue-500',
                    'Python': 'bg-indigo-400',
                    'HTML': 'bg-orange-500',
                    'CSS': 'bg-purple-500',
                    'Vue': 'bg-emerald-500',
                    'React': 'bg-sky-400'
                }[repo.language] || 'bg-slate-400';

                div.innerHTML = `
                    <div class="flex justify-between items-start mb-4">
                        <div class="flex items-center gap-2">
                            <div class="w-2 h-2 rounded-full ${langColor}"></div>
                            <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">${repo.language || 'Generic'}</span>
                        </div>
                        <i class="fas fa-arrow-right text-slate-200 group-hover:text-blue-500 transition-colors"></i>
                    </div>
                    <h4 class="font-black text-lg mb-2 truncate">${repo.name}</h4>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mb-6 line-clamp-2 leading-relaxed">${repo.description || 'Architecting the future one commit at a time.'}</p>
                    <div class="flex gap-4 text-[10px] font-black text-slate-400">
                        <span class="flex items-center gap-1"><i class="fas fa-star text-yellow-400"></i> ${repo.stargazers_count}</span>
                        <span class="flex items-center gap-1"><i class="fas fa-code-branch text-blue-400"></i> ${repo.forks_count}</span>
                    </div>
                `;
                list.appendChild(div);
            });
        }

        function renderProfile(user) {
            document.getElementById('userAvatar').src = user.avatar_url;
            document.getElementById('userName').textContent = user.name || user.login;
            document.getElementById('userLogin').querySelector('span').textContent = `@${user.login}`;
            document.getElementById('userBio').textContent = user.bio || "Crafting code in the shadows of the digital realm.";
            document.getElementById('userFollowers').textContent = user.followers.toLocaleString();
            document.getElementById('userFollowing').textContent = user.following.toLocaleString();
            document.getElementById('userRepoCount').textContent = user.public_repos;
            
            const grid = document.getElementById('contributionGrid');
            grid.innerHTML = '';
            for(let i=0; i<80; i++) {
                const cell = document.createElement('div');
                const levels = ['bg-slate-200 dark:bg-slate-700', 'bg-emerald-300', 'bg-emerald-500', 'bg-emerald-700'];
                cell.className = `contribution-cell ${levels[Math.floor(Math.random() * 4)]}`;
                grid.appendChild(cell);
            }
        }

        function saveSearch(name) {
            localStorage.setItem('gitScout_lastSearch', name);
            if (!recentSearches.includes(name)) {
                recentSearches.unshift(name);
                recentSearches = recentSearches.slice(0, 5);
                localStorage.setItem('gitScout_recent', JSON.stringify(recentSearches));
                renderRecent();
            }
        }

        function renderRecent() {
            const container = document.getElementById('recentSearches');
            if (recentSearches.length === 0) return container.classList.add('hidden');
            container.classList.remove('hidden');
            container.innerHTML = `<span class="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2 flex items-center gap-2">
                <i class="fas fa-history text-[10px]"></i> History:
            </span>`;
            recentSearches.forEach(name => {
                const btn = document.createElement('button');
                btn.className = "flex items-center gap-2 px-4 py-2 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 hover:border-blue-500 hover:text-blue-500 transition-all active:scale-95 shadow-sm";
                btn.innerHTML = `<span>${name}</span>`;
                btn.onclick = () => quickSearch(name);
                container.appendChild(btn);
            });
        }

        function renderSuggested() {
            const suggested = ['torvalds', 'gaearon', 'tj', 'yyx990803', 'sindresorhus'];
            const container = document.getElementById('suggestedList');
            container.innerHTML = '';
            suggested.forEach(user => {
                const btn = document.createElement('button');
                btn.onclick = () => quickSearch(user);
                btn.className = "group bg-white dark:bg-dark-card p-3 pr-6 rounded-2xl shadow-sm border border-slate-200 dark:border-dark-border hover:border-blue-500 hover:-translate-y-1 transition-all flex items-center gap-4 active:scale-95";
                btn.innerHTML = `<img src="https://github.com/${user}.png" class="w-8 h-8 rounded-full shadow-md transition-transform group-hover:rotate-6"><span class="font-black text-xs uppercase tracking-widest">${user}</span>`;
                container.appendChild(btn);
            });
        }

        function setUIState(state, err = "") {
            const views = {
                loading: document.getElementById('loadingState'),
                error: document.getElementById('errorState'),
                empty: document.getElementById('emptyState'),
                success: document.getElementById('profileView')
            };
            Object.values(views).forEach(v => v.classList.add('hidden'));
            document.getElementById('statusContainer').classList.toggle('hidden', state === 'success');
            if (views[state]) views[state].classList.remove('hidden');
            if (state === 'error') document.getElementById('errorMessage').textContent = err;
            document.getElementById('searchBtn').disabled = (state === 'loading');
        }

        function openModal(repo) {
            document.getElementById('modalName').textContent = repo.name;
            document.getElementById('modalDesc').textContent = repo.description || "No mission statement provided.";
            document.getElementById('modalLang').textContent = repo.language || "Native";
            document.getElementById('modalLink').href = repo.html_url;
            document.getElementById('modalStats').innerHTML = `
                <div class="bg-slate-50 dark:bg-slate-800 p-5 rounded-3xl text-center"><i class="fas fa-star text-yellow-400 mb-2 block text-xl"></i><span class="block font-black text-xl">${repo.stargazers_count}</span><span class="text-[9px] uppercase text-slate-400 font-black tracking-widest">Stars</span></div>
                <div class="bg-slate-50 dark:bg-slate-800 p-5 rounded-3xl text-center"><i class="fas fa-code-branch text-blue-400 mb-2 block text-xl"></i><span class="block font-black text-xl">${repo.forks_count}</span><span class="text-[9px] uppercase text-slate-400 font-black tracking-widest">Forks</span></div>
                <div class="bg-slate-50 dark:bg-slate-800 p-5 rounded-3xl text-center"><i class="fas fa-eye text-indigo-400 mb-2 block text-xl"></i><span class="block font-black text-xl">${repo.watchers}</span><span class="text-[9px] uppercase text-slate-400 font-black tracking-widest">Watchers</span></div>`;
            const modal = document.getElementById('repoModal');
            modal.classList.remove('hidden');
            setTimeout(() => {
                document.getElementById('modalOverlay').classList.replace('opacity-0', 'opacity-100');
                modal.querySelector('.relative').classList.replace('scale-90', 'scale-100');
                modal.querySelector('.relative').classList.replace('opacity-0', 'opacity-100');
            }, 10);
        }

        function hideModal() {
            const modal = document.getElementById('repoModal');
            document.getElementById('modalOverlay').classList.replace('opacity-100', 'opacity-0');
            modal.querySelector('.relative').classList.replace('scale-100', 'scale-90');
            modal.querySelector('.relative').classList.replace('opacity-100', 'opacity-0');
            setTimeout(() => modal.classList.add('hidden'), 300);
        }

        async function quickSearch(user) { usernameInput.value = user; window.scrollTo({ top: 0, behavior: 'smooth' }); performSearch(user); }
        function goHome() { usernameInput.value = ''; setUIState('empty'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
        searchForm.onsubmit = (e) => { e.preventDefault(); performSearch(usernameInput.value.trim()); };
        repoFilter.oninput = handleRepoUpdate;
        repoSort.onchange = handleRepoUpdate;