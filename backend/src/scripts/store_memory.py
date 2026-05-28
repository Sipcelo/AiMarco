#!/usr/bin/env python3
"""
store_memory.py

Script auxiliar que recebe fatos em JSON via stdin e os armazena no Mem0.
Usa o SDK Python oficial (mem0ai).

Uso:
  python backend/src/scripts/store_memory.py < facts.json

Formato do JSON de entrada:
{
  "facts": [
    {
      "content": "string com o fato",
      "metadata": {
        "category": "stack|database_constraint|business_rule|api|architecture",
        "source": "arquivo ou migrate",
        "importance": "critical|high|medium"
      }
    }
  ],
  "user_id": "aimarco-project"  # opcional
}
"""

import sys
import json
import os
from mem0 import MemoryClient

def main():
    # Ler JSON da stdin
    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        print(f"Erro: JSON inválido na stdin: {e}", file=sys.stderr)
        sys.exit(1)

    facts = input_data.get('facts', [])
    user_id = input_data.get('user_id', 'aimarco-project')

    if not facts:
        print("Nenhum fato para armazenar.", file=sys.stderr)
        sys.exit(0)

    # Inicializar cliente Mem0 (se API key disponível)
    api_key = os.environ.get('MEM0_API_KEY')
    store_type = 'unknown'

    if api_key:
        try:
            client = MemoryClient(api_key=api_key)
            store_type = 'mem0_cloud'
        except Exception as e:
            print(f"⚠️  Erro ao inicializar Mem0 Cloud: {e}", file=sys.stderr)
            print("   Usando fallback local...", file=sys.stderr)
            client = None
    else:
        print("⚠️  MEM0_API_KEY não definida. Usando armazenamento local (JSON file).")
        client = None
        store_type = 'local_json'

    # Armazenar
    if client:
        # Usar Mem0 Cloud
        try:
            messages = [{"role": "user", "content": fact['content']} for fact in facts]
            result = client.add(
                messages=messages,
                user_id=user_id,
                metadata=[fact['metadata'] for fact in facts]
            )
            print(f"✅ {len(facts)} fatos armazenados no Mem0 Cloud.")
            print(f"   User ID: {user_id}")
            if result:
                print(f"   Resultado: {result}")
        except Exception as e:
            print(f"❌ Erro ao armazenar no Mem0 Cloud: {e}", file=sys.stderr)
            sys.exit(1)
    else:
        # Fallback local: armazenar em arquivo JSON
        store_file = os.path.join(os.path.dirname(__file__), '.mem0_store.json')
        try:
            # Carregar store existente
            if os.path.exists(store_file):
                with open(store_file, 'r', encoding='utf-8') as f:
                    store = json.load(f)
            else:
                store = {"user_id": user_id, "facts": []}

            # Índice de conteúdo existente para evitar duplicatas
            existing_contents = {(fact.get('content', ''), fact['metadata'].get('source', '')) for fact in store['facts']}

            import time
            new_count = 0
            for fact in facts:
                key = (fact['content'], fact['metadata'].get('source', ''))
                if key not in existing_contents:
                    store['facts'].append({
                        'id': f"fact_{int(time.time() * 1000)}_{len(store['facts'])}",
                        'content': fact['content'],
                        'metadata': fact['metadata'],
                        'created_at': time.strftime('%Y-%m-%dT%H:%M:%S%z')
                    })
                    new_count += 1
                # else: fato já existe, pulamos

            # Salvar apenas se houve novos fatos
            if new_count > 0:
                with open(store_file, 'w', encoding='utf-8') as f:
                    json.dump(store, f, indent=2, ensure_ascii=False)

                print(f"✅ {new_count} fatos armazenados em {store_file}")
                print(f"   Total no store local: {len(store['facts'])} fatos")
            else:
                print(f"✅ Nenhum fato novo. Store local já contém todos os {len(store['facts'])} fatos.")
        except Exception as e:
            print(f"❌ Erro ao armazenar localmente: {e}", file=sys.stderr)
            sys.exit(1)

if __name__ == '__main__':
    main()
