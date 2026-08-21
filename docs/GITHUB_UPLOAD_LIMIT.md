# GitHub Upload Limit Workaround

GitHub's web uploader limits the number of files in one browser upload. The project itself is unchanged. The preferred solution is to upload the repository with Git, which transfers the complete directory tree in one operation and preserves file history.

## Preferred method: Git bundle

Download `ai-mis-copilot-github.bundle`, then run:

```bash
git clone ai-mis-copilot-github.bundle ai-mis-copilot
git remote add origin https://github.com/OWNER/REPOSITORY.git
cd ai-mis-copilot
git branch -M main
git push -u origin main
```

If cloning from a local bundle is not supported by the Git installation, use:

```bash
mkdir ai-mis-copilot
git init ai-mis-copilot
cd ai-mis-copilot
git remote add origin https://github.com/OWNER/REPOSITORY.git
git fetch /path/to/ai-mis-copilot-github.bundle main
git checkout -B main FETCH_HEAD
git push -u origin main
```

The Git bundle is the lossless option. It contains the committed repository and does not require uploading 140 files through the browser.

## Browser fallback

If Git cannot be used, upload the two batch archives sequentially. Extract each archive locally first; do not upload the ZIP files themselves as project source. Upload the files from `ai-mis-copilot-github-batch-1.zip` through the GitHub web interface, then upload the files from `ai-mis-copilot-github-batch-2.zip` to the same repository and branch. Each batch contains no more than 80 files and preserves the original paths.

Do not rename files or flatten directories during extraction. Uploading batch 2 after batch 1 completes the repository tree without deleting anything from batch 1.

## Excluded files

The packages intentionally omit `node_modules`, `dist`, runtime logs, `.project-config.json`, generated Manus runtime files, the local `.git` directory, and editor backup files. These are regenerated or managed outside GitHub and are not needed for quality or reproducibility.
