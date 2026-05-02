
from bs4 import BeautifulSoup

def find_judgment_links():
    with open('search_result_source.html', 'r', encoding='utf-8') as f:
        html = f.read()

    soup = BeautifulSoup(html, 'lxml')
    
    print("--- 尋找包含 '號' 的連結 (可能是判決書連結) ---")
    # 尋找所有 <a> 標籤，其文字包含「號」字
    links = soup.find_all('a', string=lambda text: text and '號' in text)
    
    if not links:
        print("找不到包含 '號' 的連結。")
        return

    # 分析前 3 個找到的連結的結構
    for i, link in enumerate(links[:3]):
        print(f"\n[{i+1}] 找到連結文字: '{link.text.strip()}'")
        print(f"    href 屬性: '{link.get('href')}'")
        print(f"    class 屬性: '{link.get('class')}'")
        print(f"    id 屬性: '{link.get('id')}'")
        
        # 往上找父節點，看看它是怎麼被包裝的
        parent = link.parent
        print(f"    直接父節點標籤: <{parent.name}>")
        print(f"    父節點 class: {parent.get('class')}")
        
        # 再往上找一層
        grandparent = parent.parent
        print(f"    祖父節點標籤: <{grandparent.name}>")
        print(f"    祖父節點 class: {grandparent.get('class')}")

if __name__ == '__main__':
    find_judgment_links()
