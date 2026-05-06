{ pkgs, ... }: {
  # Which version of the Nixpkgs channel to use
  channel = "stable-24.05";

  # The packages to install in your environment
  packages = [
    pkgs.nodejs_22
    pkgs.postgresql
  ];

  # IDX-specific configuration
  idx = {
    # Search for and install VS Code extensions
    extensions = [
      "dbaeumer.vscode-eslint"
    ];

    # Configure the preview environment
    previews = {
      enable = true; # Often required to initialize the preview block
      previews = {
        web = {
          command = [
            "npm"
            "run"
            "dev"
            "--"
            "--port"
            "$PORT"
            "--host"
            "0.0.0.0"
          ];
          manager = "web";
        };
      };
    };
  };
}