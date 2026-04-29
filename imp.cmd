npm run dev
npm run build
npm run deploy


echo "node_modules/" >> .gitignore
git rm -r --cached node_modules
git add .gitignore
git commit -m "Ignore node_modules"
git push