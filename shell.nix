{
  pkgs ? import (fetchTarball "https://github.com/NixOS/nixpkgs/archive/632f04521e847173c54fa72973ec6c39a371211c.tar.gz") {
    config.allowUnfree = true;
  }
}:

pkgs.mkShell {
  buildInputs = with pkgs; [
    bazelisk
    buildifier
    neovim
    nodePackages.pnpm
    nodejs-slim_22
  ];

  shellHook = ''
    alias bazel=bazelisk
    alias vim=nvim

    # Forgive me
    export HISTFILESIZE=
    export HISTSIZE=
    export PS1="\[\033[1;32m\][esc:\w]\$\[\033[0m\] "
  '';
}
