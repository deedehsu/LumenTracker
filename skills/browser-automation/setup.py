from setuptools import setup

APP = ['gui_extractor.py']
DATA_FILES = ['tw_judgment_extractor.py']
OPTIONS = {
    'argv_emulation': False,
    'packages': ['tkinter', 'requests', 'bs4', 'markdownify'],
    'iconfile': '', # can add icon later
}

setup(
    app=APP,
    name="LumenGatherer",
    data_files=DATA_FILES,
    options={'py2app': OPTIONS},
    setup_requires=['py2app'],
)
