import os
import sys
from dotenv import load_dotenv
from huggingface_hub import HfApi

# Cargar variables de entorno desde .env
load_dotenv()

def main():
    # 1. Verificar token
    token = os.getenv("HF_TOKEN")
    if not token:
        print("❌ ERROR: No se encontró la variable HF_TOKEN en el archivo .env")
        print("Por favor, genera un token con permisos de 'Write' en https://huggingface.co/settings/tokens")
        sys.exit(1)

    # 2. Pedir configuración
    print("🚀 Preparando para subir las guías a Hugging Face...\n")
    repo_id = input("Ingresá el ID de tu repositorio (formato: tu_usuario/nombre_dataset, ej: nojustbenja/cosmetic-guidelines): ").strip()
    
    if not repo_id or "/" not in repo_id:
        print("❌ ID de repositorio inválido. Debe tener el formato usuario/nombre")
        sys.exit(1)

    # 3. Inicializar API
    api = HfApi()

    # 4. Crear el repositorio si no existe
    try:
        print(f"\n📦 Verificando/Creando el repositorio: {repo_id}")
        api.create_repo(repo_id=repo_id, repo_type="dataset", exist_ok=True, token=token)
        print("✅ Repositorio listo.")
    except Exception as e:
        print(f"❌ Error al verificar/crear el repositorio: {e}")
        sys.exit(1)

    # 5. Subir la carpeta
    # Calculamos la ruta a la carpeta data/guias
    current_dir = os.path.dirname(os.path.abspath(__file__))
    local_folder = os.path.join(current_dir, "data", "guias")
    
    if not os.path.exists(local_folder):
        print(f"❌ ERROR: No se encontró la carpeta {local_folder}")
        sys.exit(1)

    try:
        print(f"📤 Subiendo archivos desde {local_folder}...")
        api.upload_folder(
            folder_path=local_folder,
            repo_id=repo_id,
            repo_type="dataset",
            token=token,
            commit_message="Subiendo guías de dermocosmética al dataset"
        )
        print("\n🎉 ¡Subida completada con éxito!")
        print(f"Podés ver tu dataset público acá: https://huggingface.co/datasets/{repo_id}")
    except Exception as e:
        print(f"❌ Error al subir los archivos: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
