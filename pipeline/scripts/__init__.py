import pathlib
import subprocess
import os
import shutil


def package_watchtower_vue():
    pipeline_dir = pathlib.Path(__file__).parent.parent
    project_root = pipeline_dir.parent.absolute()
    os.chdir(project_root)
    subprocess.call(['yarn', 'build'], stdout=subprocess.PIPE)
    shutil.rmtree(project_root / 'dist/static/projects')
    shutil.rmtree(project_root / 'dist/static/previews')
    shutil.move(project_root / 'dist', project_root / 'pipeline/dist_watchtower')
    os.chdir(pipeline_dir)


