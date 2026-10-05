import importlib.util, pathlib
p=pathlib.Path(__file__).parents[1]/"scripts"/"check_contrast.py"
spec=importlib.util.spec_from_file_location("check_contrast",p); m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
def test_black_white_contrast():
    assert round(m.contrast("#000000","#FFFFFF"),1)==21.0
