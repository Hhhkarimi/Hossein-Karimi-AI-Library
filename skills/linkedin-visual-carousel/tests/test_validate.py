import importlib.util, pathlib, json
p=pathlib.Path(__file__).parents[1]/"scripts"/"validate_spec.py"
spec=importlib.util.spec_from_file_location("validate_spec",p); m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
def test_sample_has_no_errors():
    sample=json.load(open(pathlib.Path(__file__).parents[1]/"examples"/"sample-carousel-spec.fa.json",encoding="utf-8"))
    errors,_=m.validate(sample)
    assert not errors
