import http.server
import socketserver
import os
import sys

PORT = 8000

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        # Decode path to handle URL percent encoding (e.g. %20 -> space)
        import urllib.parse
        decoded_path = urllib.parse.unquote(path)
        
        # If the path starts with /assets/, map it to core assets directory
        if decoded_path.startswith('/assets/'):
            relative_path = decoded_path[len('/assets/'):]
            current_dir = os.path.dirname(os.path.abspath(__file__))
            # Path to e:\Source\shattered-pixel-dungeon\core\src\main\assets
            assets_dir = os.path.abspath(os.path.join(current_dir, '..', 'core', 'src', 'main', 'assets'))
            target_path = os.path.join(assets_dir, relative_path)
            return target_path
            
        return super().translate_path(decoded_path)

if __name__ == '__main__':
    # Change working directory to the script's folder to serve it as web root
    script_dir = os.path.dirname(os.path.abspath(__file__))
    if script_dir:
        os.chdir(script_dir)
    
    # Allow port reuse to avoid 'Address already in use' errors during restarts
    socketserver.TCPServer.allow_reuse_address = True
    
    with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
        print(f"Serving Shattered Pixel Dungeon Web Co-op at http://localhost:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
            sys.exit(0)
