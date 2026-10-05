import importlib.util, pathlib
p=pathlib.Path(__file__).parents[1]/"scripts"/"palette_advisor.py"
spec=importlib.util.spec_from_file_location("palette_advisor",p); m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
def test_ai_topic_prefers_ai_palette():
    assert m.recommend("هوش مصنوعی داده نرم‌افزار RAG",1)[0]["key"]=="ai-tech"
def test_growth_topic_prefers_growth_palette():
    assert m.recommend("مارکتینگ رشد فروش لید SEO",1)[0]["key"]=="growth"
