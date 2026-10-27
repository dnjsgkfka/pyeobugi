// 디자이너가 만든 시작 화면의 그림(무대 마크업). 원본 SVG 를 그대로 둔다.
// 애니메이션은 intro-animation.ts 가 이 마크업을 찾아 움직인다.
export const INTRO_STAGE_HTML = `<div id="bg" class="abs" aria-hidden="true"><svg width="100%" height="100%" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false" viewBox="0 0 1280 832" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0_48_2572)">
<rect width="1280" height="832" fill="#16202F"/>
<rect y="115" width="1280" height="717" fill="url(#paint0_linear_48_2572)"/>
<path d="M1262.5 246L1229 265.986H1163.5L1121.5 290.5L1105.5 324.993L1051.5 316.486L1016 333.5L998.5 370.493L905.5 416.493L872 349.993L832.5 316.486L810.5 357.486L793.5 265.986L721.5 379.993L681 494.986L635.5 447L459.5 355.993L415.5 379.993L339.5 456.5L254.5 379.993L235 333.5L192.5 324.993L157.5 273.993H136V230L88 168L-75 181L-67 273.993L-22.5 821.5L1262.5 826.5V246Z" fill="#2A3747" fill-opacity="0.5"/>
<path d="M1298.5 601.5V-68L1267 30L1214.5 106.5L1190.5 186.5L1184.5 211L1201 239V250L1217.5 283L1206 301.5L1211 309L1203.5 335.5L1211 349L1194 361.5L1190.5 377L1170 422.5L1173 451.5L1084.5 389.5L1008 417V451.5L959 434L925 377L908.5 381.5L903 392.5L890 399.5L868.5 424L853 438L839 443L837 446V451.5L824.5 456.5L813 465.5L763.5 547.5L611 652L460 475.5L403.5 494.5L358 480L347 434L283 471L273.5 530L238.5 480V451.5L176.5 389.5L143.5 408L76 359L-51 389.5L-38 701.5H1298.5V601.5Z" fill="#2A3747"/>
<path d="M365.345 441.362C362.039 440.999 364.622 454.355 363.716 462.638C362.294 475.649 358.38 495.726 358.38 495.726L360.469 490.956C360.469 490.956 386.727 443.71 365.345 441.362Z" fill="#2A3747"/>
<path d="M348.317 493.333C346.033 490.914 358.246 484.923 364.308 479.206C373.831 470.227 387.489 455 387.489 455L384.942 459.542C384.942 459.542 363.081 508.976 348.317 493.333Z" fill="#2A3747"/>
<path d="M849.647 402.228C847.889 403.255 852.149 409.28 862.829 420.854C873.51 432.429 884.783 444.953 884.783 444.953L881.151 431.366C881.151 431.366 861.019 395.589 849.647 402.228Z" fill="#2A3747"/>
<path d="M878.884 428.536C881.377 427.663 872.025 420.45 875.145 414.374C880.866 403.234 865.441 375.902 865.24 387.196C865.211 388.811 865.378 391.33 865.378 391.33C865.378 391.33 862.759 434.184 878.884 428.536Z" fill="#2A3747"/>
<path d="M876.355 374.362C873.049 373.999 875.631 387.355 874.726 395.638C873.303 408.649 869.39 428.726 869.39 428.726L871.478 423.956C871.478 423.956 897.737 376.71 876.355 374.362Z" fill="#2A3747"/>
<path d="M-18 738V68.5L124 260.5C124 260.5 129.871 415.978 187.5 488C219.165 527.574 288.5 569.5 288.5 569.5L355.5 513.5C355.5 513.5 408.707 607.909 458.5 654.5C607.275 793.707 783.336 811.146 973.5 738C1090.74 692.905 1100.73 563.772 1223 535C1264.39 525.261 1318.5 456.5 1318.5 456.5V838H-18V738Z" fill="#16202F"/>
<path d="M1135 554L1142.5 522H1178L1187.5 541L1240 589L1224 631H1135V554Z" fill="#16202F"/>
<path d="M144.621 316.623C149.117 343.689 127.603 347.536 116.284 346.077L123.691 354.585C128.959 354.72 140.692 353.014 145.475 345.114C151.453 335.239 149.764 321.657 150.195 306.453C150.324 301.943 151.193 291.431 169.387 273.412C181.114 261.798 216.294 241.428 187.414 235.186C158.535 228.943 139.001 282.79 144.621 316.623Z" fill="#16202F"/>
<path d="M138.991 311.61C147.159 326.865 138.459 337.781 133.089 341.332L138.324 343.761C140.7 341.765 145.534 336.059 145.862 329.2C146.273 320.626 142.427 312.747 139.155 303.01C138.185 300.122 136.177 293.165 140.17 274.643C142.744 262.705 153.762 235.997 139.485 243.473C125.208 250.949 128.781 292.542 138.991 311.61Z" fill="#16202F"/>
<path d="M192.5 435.124C180.523 479.824 178.885 518.223 174.437 517.031C169.99 515.839 176.094 478.637 188.071 433.937C200.048 389.237 213.363 353.966 217.811 355.158C222.259 356.35 204.478 390.423 192.5 435.124Z" fill="#16202F"/>
<path d="M1049.94 385.726C1058.76 405.172 1059.96 421.877 1063.24 421.358C1066.51 420.84 1062.02 404.656 1053.2 385.21C1044.38 365.764 1034.58 350.42 1031.3 350.939C1028.03 351.457 1041.12 366.28 1049.94 385.726Z" fill="#2A3747"/>
<path d="M174.142 450.106C176.644 472.374 186.976 489.493 182.4 490.007C177.824 490.521 172.087 472.886 169.586 450.617C167.084 428.349 168.766 409.88 173.342 409.366C177.918 408.852 171.641 427.837 174.142 450.106Z" fill="#16202F"/>
<path d="M1063.46 392.244C1061.61 401.931 1054.01 409.379 1057.38 409.602C1060.74 409.826 1064.97 402.154 1066.81 392.466C1068.65 382.779 1067.41 374.745 1064.04 374.521C1060.68 374.297 1065.3 382.556 1063.46 392.244Z" fill="#2A3747"/>
<path d="M183.829 454.06C180.14 488.792 185.46 517.831 180.881 517.345C176.302 516.859 175.58 488.308 179.269 453.576C182.957 418.843 182.155 394.804 194.238 391.567C198.817 392.054 187.517 419.327 183.829 454.06Z" fill="#16202F"/>
<path d="M1056.32 393.964C1059.04 409.074 1055.12 421.706 1058.49 421.495C1061.86 421.283 1062.4 408.863 1059.68 393.753C1056.96 378.644 1057.55 368.186 1048.66 366.778C1045.29 366.989 1053.61 378.854 1056.32 393.964Z" fill="#2A3747"/>
<path d="M175.597 490.153C156.936 519.677 159.94 535.124 156.048 532.664C152.155 530.204 164.128 504.275 182.79 474.75C201.452 445.226 219.735 423.286 223.628 425.746C224.966 434.76 194.259 460.628 175.597 490.153Z" fill="#16202F"/>
<path d="M1062.38 409.665C1076.12 422.509 1073.91 429.229 1076.78 428.159C1079.64 427.089 1070.83 415.809 1057.09 402.965C1043.35 390.121 1029.89 380.576 1027.02 381.646C1026.04 385.568 1048.64 396.821 1062.38 409.665Z" fill="#2A3747"/>
<path d="M1128.23 438.726C1119.41 458.172 1118.2 474.877 1114.93 474.358C1111.65 473.84 1116.15 457.656 1124.97 438.21C1133.78 418.764 1143.59 403.42 1146.86 403.939C1150.14 404.457 1137.05 419.28 1128.23 438.726Z" fill="#2A3747"/>
<path d="M1124.69 408.79C1126.53 418.478 1134.14 425.925 1130.77 426.149C1127.4 426.372 1123.18 418.7 1121.33 409.013C1119.49 399.325 1120.73 391.291 1124.1 391.067C1127.47 390.844 1122.85 399.103 1124.69 408.79Z" fill="#2A3747"/>
<path d="M1130.6 432.589C1127.88 447.699 1131.8 460.332 1128.43 460.12C1125.06 459.909 1124.53 447.489 1127.24 432.379C1129.96 417.269 1129.37 406.812 1138.26 405.403C1141.63 405.615 1133.31 417.48 1130.6 432.589Z" fill="#2A3747"/>
<path d="M1226.11 468.062C1231.8 466.683 1233.37 490.31 1234.91 500.939C1238.87 528.421 1249.22 563.457 1249.22 563.457L1226.98 543.758C1226.98 543.758 1189.29 476.979 1226.11 468.062Z" fill="#16202F"/>
<path d="M1200.72 492.472C1205.63 489.283 1205.6 515.47 1220.49 518.238C1247.78 523.314 1254.72 572.473 1254.72 572.473L1247.66 566.623C1247.66 566.623 1168.94 513.094 1200.72 492.472Z" fill="#16202F"/>
<path d="M1267.89 466.387C1273.45 468.239 1254.84 501.627 1254.84 501.627L1239.04 558.492L1239.2 549.323C1239.2 549.323 1231.95 454.41 1267.89 466.387Z" fill="#16202F"/>
<path d="M92.5554 180.875C96.7143 176.749 129.731 171.745 121.566 178.721C100.455 196.757 45.9374 228.82 45.9374 228.82L53.7695 198.085C53.7695 198.085 67.4648 205.763 92.5554 180.875Z" fill="#16202F"/>
<path d="M103.606 150.212C108.548 153.357 84.7144 164.205 88.3816 178.898C95.1054 205.838 53.2702 232.567 53.2702 232.567L55.6573 223.713C55.6573 223.713 71.6468 129.876 103.606 150.212Z" fill="#16202F"/>
<path d="M81.3135 123.042C87.0356 124.296 72.0637 159.464 72.0637 159.464L62.3554 217.682L61.5533 208.546C61.5533 208.546 44.3112 114.931 81.3135 123.042Z" fill="#16202F"/>
<path d="M117 346L129 331.5L142 325.5L159 379L154.5 402L159 444.5L135.5 416L117 394V346Z" fill="#16202F"/>
<path d="M143.036 333.464L150.964 338.464L146.965 363.464L143.035 349.106L135.964 342.035L143.036 333.464Z" fill="#16202F"/>
<path d="M1019 404L1032.5 397L1040.5 408L1048 400.5L1069 404L1048 427H1019L1014 412L1019 404Z" fill="#2A3747"/>
<path d="M925 415L938.5 408L946.5 419L943.5 410.5L954 411.5L975 415L977 422L972 429.5L978.5 428L984 431L978.5 446L990 456.5L954 438H925L920 423L925 415Z" fill="#2A3747"/>
</g>
<defs>
<linearGradient id="paint0_linear_48_2572" x1="640" y1="115" x2="640" y2="832" gradientUnits="userSpaceOnUse">
<stop stop-color="#34A8A8" stop-opacity="0"/>
<stop offset="1" stop-color="#34A8A8"/>
</linearGradient>
<clipPath id="clip0_48_2572">
<rect width="1280" height="832" fill="white"/>
</clipPath>
</defs>
</svg></div>
  <div id="bigLogo" class="abs" aria-hidden="true"><svg width="100%" height="100%" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false" viewBox="0 0 846 520" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M19.2233 402.63V372.4H43.4697V260.93H19.2233V230.701H211.305V257.781H238.386V227.237H269.874V405.779H238.386V332.41H201.544V302.495H238.386V287.696H201.544V260.93H187.059V372.4H211.305V402.63H19.2233ZM74.9586 372.4H155.57V260.93H74.9586V372.4ZM307.666 323.908V227.552H339.155V249.909H518.641V227.552H550.13V323.908H307.666ZM301.368 367.677V337.448H558.317V367.677H449.996V405.779H418.507V367.677H301.368ZM339.155 293.678H518.641V280.138H339.155V293.678ZM795.266 405.779V227.237H826.755V405.779H795.266ZM575.789 260.93V230.701H771.334V402.63H739.845V260.93H575.789Z" fill="#CFF4F0"/>
</svg></div>

  <div id="laptop" class="abs">
    <div id="glow" class="abs" aria-hidden="true"><svg width="100%" height="100%" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false" viewBox="0 0 1196 1069" fill="none" xmlns="http://www.w3.org/2000/svg">
<g filter="url(#filter0_f_48_2614)" style="mix-blend-mode:screen">
<path d="M60 217H534.084H598.503H662.922H1136V1009H60V217Z" fill="#C4FFF9" fill-opacity="0.2"/>
</g>
<rect x="89.8364" y="241.836" width="1016.33" height="668.327" rx="17.6727" fill="#EEF3F3" stroke="#16202F" stroke-width="17.6727"/>
<rect x="537.332" y="233" width="119.881" height="40.3047" rx="4.41818" fill="#16202F"/>
<g filter="url(#filter1_f_48_2614)" style="mix-blend-mode:screen">
<path d="M97.3867 250.233H538.072V274.091H657.834V250.233H1097.58V721.794H97.3867V250.233Z" fill="#C4FFF9" fill-opacity="0.2"/>
</g>
<defs>
<filter id="filter0_f_48_2614" x="0" y="157" width="1196" height="912" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
<feGaussianBlur stdDeviation="30" result="effect1_foregroundBlur_48_2614"/>
</filter>
<filter id="filter1_f_48_2614" x="49.3867" y="202.233" width="1096.2" height="567.562" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
<feGaussianBlur stdDeviation="24" result="effect1_foregroundBlur_48_2614"/>
</filter>
</defs>
</svg></div>
    <div id="turtleBody" class="abs turtle" aria-hidden="true"><svg width="100%" height="100%" viewBox="0 0 420 420" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" style="overflow:visible"><g class="t-body"><g filter="url(#filter0_i_48_2670)">
<path d="M57.0004 278.92C57.0004 293.437 89.1843 298.196 103.702 298.196C118.219 298.196 129.987 295.803 129.987 281.286C129.987 266.769 118.219 255 103.702 255C89.1843 255 57.0004 264.403 57.0004 278.92Z" fill="#34A8A8"/>
</g><g filter="url(#filter1_i_48_2670)">
<path d="M362.975 278.92C362.975 293.437 330.791 298.196 316.274 298.196C301.757 298.196 289.988 295.803 289.988 281.286C289.988 266.769 301.757 255 316.274 255C330.791 255 362.975 264.403 362.975 278.92Z" fill="#34A8A8"/>
</g><g class="t-shell"><g filter="url(#filter2_i_48_2670)">
<path d="M337 232.181C337 302.42 279.916 314 209.5 314C139.084 314 82 302.42 82 232.181C82 161.941 139.084 105 209.5 105C279.916 105 337 161.941 337 232.181Z" fill="#008180"/>
</g><g filter="url(#filter3_i_48_2670)">
<path d="M342.74 237.87C342.74 311.252 283.252 272.859 209.87 272.859C136.488 272.859 77 311.252 77 237.87C77 164.488 136.488 105 209.87 105C283.252 105 342.74 164.488 342.74 237.87Z" fill="url(#paint0_radial_48_2670)"/>
</g></g></g><defs>
<filter id="filter0_i_48_2670" x="57" y="253.228" width="80.0773" height="44.9679" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dx="7.09" dy="-1.77162"/>
<feGaussianBlur stdDeviation="10.6297"/>
<feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
<feColorMatrix type="matrix" values="0 0 0 0 0.811765 0 0 0 0 0.956863 0 0 0 0 0.941176 0 0 0 1 0"/>
<feBlend mode="normal" in2="shape" result="effect1_innerShadow_48_2670"/>
</filter>
<filter id="filter1_i_48_2670" x="282.902" y="253.228" width="80.0738" height="44.9679" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dx="-7.08648" dy="-1.77162"/>
<feGaussianBlur stdDeviation="10.6297"/>
<feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
<feColorMatrix type="matrix" values="0 0 0 0 0.811765 0 0 0 0 0.956863 0 0 0 0 0.941176 0 0 0 1 0"/>
<feBlend mode="normal" in2="shape" result="effect1_innerShadow_48_2670"/>
</filter>
<filter id="filter2_i_48_2670" x="82" y="97.9136" width="255" height="216.086" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dy="-7.0864"/>
<feGaussianBlur stdDeviation="5.3148"/>
<feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
<feColorMatrix type="matrix" values="0 0 0 0 0.811765 0 0 0 0 0.956863 0 0 0 0 0.941176 0 0 0 0.6 0"/>
<feBlend mode="normal" in2="shape" result="effect1_innerShadow_48_2670"/>
</filter>
<filter id="filter3_i_48_2670" x="59.284" y="97.9136" width="283.456" height="184.984" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dx="-17.716" dy="-7.0864"/>
<feGaussianBlur stdDeviation="15.9444"/>
<feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
<feBlend mode="normal" in2="shape" result="effect1_innerShadow_48_2670"/>
</filter>
<filter id="filter4_i_48_2670" x="57.6289" y="252.525" width="88.6906" height="77.0792" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dx="7.09" dy="-1.7716"/>
<feGaussianBlur stdDeviation="10.6296"/>
<feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
<feColorMatrix type="matrix" values="0 0 0 0 0.811765 0 0 0 0 0.956863 0 0 0 0 0.941176 0 0 0 1 0"/>
<feBlend mode="normal" in2="shape" result="effect1_innerShadow_48_2670"/>
</filter>
<filter id="filter5_i_48_2670" x="274.675" y="252.525" width="88.687" height="77.0792" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dx="-7.0864" dy="-1.7716"/>
<feGaussianBlur stdDeviation="10.6296"/>
<feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
<feColorMatrix type="matrix" values="0 0 0 0 0.811765 0 0 0 0 0.956863 0 0 0 0 0.941176 0 0 0 1 0"/>
<feBlend mode="normal" in2="shape" result="effect1_innerShadow_48_2670"/>
</filter>
<filter id="filter6_i_48_2670" x="66.3704" y="74" width="276.37" height="220.121" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dx="-10.6296" dy="1.7716"/>
<feGaussianBlur stdDeviation="17.716"/>
<feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
<feColorMatrix type="matrix" values="0 0 0 0 0.811765 0 0 0 0 0.956863 0 0 0 0 0.941176 0 0 0 0.8 0"/>
<feBlend mode="normal" in2="shape" result="effect1_innerShadow_48_2670"/>
</filter>
<filter id="filter7_dd_48_2670" x="128.568" y="171.438" width="100.981" height="111.611" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset/>
<feGaussianBlur stdDeviation="17.716"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.6 0"/>
<feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_48_2670"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset/>
<feGaussianBlur stdDeviation="2.6574"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.8 0"/>
<feBlend mode="normal" in2="effect1_dropShadow_48_2670" result="effect2_dropShadow_48_2670"/>
<feBlend mode="normal" in="SourceGraphic" in2="effect2_dropShadow_48_2670" result="shape"/>
</filter>
<filter id="filter8_f_48_2670" x="163.072" y="207.459" width="13.4721" height="24.0852" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
<feGaussianBlur stdDeviation="1.7716" result="effect1_foregroundBlur_48_2670"/>
</filter>
<filter id="filter9_dd_48_2670" x="189.687" y="171.438" width="100.981" height="111.611" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset/>
<feGaussianBlur stdDeviation="17.716"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.6 0"/>
<feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_48_2670"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset/>
<feGaussianBlur stdDeviation="2.6574"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.8 0"/>
<feBlend mode="normal" in2="effect1_dropShadow_48_2670" result="effect2_dropShadow_48_2670"/>
<feBlend mode="normal" in="SourceGraphic" in2="effect2_dropShadow_48_2670" result="shape"/>
</filter>
<filter id="filter10_f_48_2670" x="223.751" y="207.459" width="13.4721" height="24.0852" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
<feGaussianBlur stdDeviation="1.7716" result="effect1_foregroundBlur_48_2670"/>
</filter>
<radialGradient id="paint0_radial_48_2670" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(209.87 193.949) rotate(89.9304) scale(107.051 159.911)">
<stop offset="0.259963" stop-color="#34A8A8"/>
<stop offset="1" stop-color="#014A49"/>
</radialGradient>
</defs>
</svg></div>
    <div id="screen" class="abs">
      <div id="sheen" class="abs" aria-hidden="true"></div>
      <div id="notch" class="abs" aria-hidden="true"></div>
      <div id="loadingText" class="abs screen-pad">
        <p class="display">Loading<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></p>
      </div>
      <div id="startContent" class="abs screen-pad">
        <div class="intro">
          <h1 class="display">당신의 자세 건강,<br>펴부기가 지켜드릴게요.</h1>
          <p class="body16">공부하거나 일하는 동안 웹캠으로 앉은 자세를 살피고,<br>자세가 구부정해지기 시작하면 펴부기가 알려드려요.</p>
        </div>
        <ol class="points">
          <li><span class="num">1</span><span class="body16">웹캠으로 자세를 실시간으로 살펴요</span></li>
          <li><span class="num">2</span><span class="body16">영상은 기기 안에서만 처리돼요</span></li>
          <li><span class="num">3</span><span class="body16">자세가 무너지면 펴부기가 알려줘요</span></li>
        </ol>
        <div><button id="startBtn" class="btn btn-primary" tabindex="-1">시작하기</button></div>
      </div>
      <div id="screenFill" class="abs" aria-hidden="true"></div>
    </div>
    <div id="turtleFront" class="abs turtle" aria-hidden="true"><svg class="t-flips" width="100%" height="100%" viewBox="0 0 420 420" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" style="overflow:visible"><g class="t-fl t-fl-l"><g filter="url(#filter0_i_48_2671)">
<path d="M59.534 322.015C69.5686 339.395 111.389 322.847 128.77 312.812C146.15 302.778 138.805 285.808 128.771 268.427C118.736 251.047 116.292 251.062 98.9117 261.097C81.5313 271.131 49.4994 304.635 59.534 322.015Z" fill="#34A8A8"/>
</g></g><g class="t-fl t-fl-r"><g filter="url(#filter1_i_48_2671)">
<path d="M361.457 322.015C351.423 339.395 309.602 322.847 292.221 312.812C274.841 302.778 282.186 285.808 292.22 268.427C302.255 251.047 304.699 251.062 322.079 261.097C339.46 271.131 371.492 304.635 361.457 322.015Z" fill="#34A8A8"/>
</g></g><defs>
<filter id="filter0_i_48_2671" x="57.6289" y="252.525" width="88.6906" height="77.0792" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dx="7.09" dy="-1.7716"/>
<feGaussianBlur stdDeviation="10.6296"/>
<feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
<feColorMatrix type="matrix" values="0 0 0 0 0.811765 0 0 0 0 0.956863 0 0 0 0 0.941176 0 0 0 1 0"/>
<feBlend mode="normal" in2="shape" result="effect1_innerShadow_48_2671"/>
</filter>
<filter id="filter1_i_48_2671" x="274.675" y="252.525" width="88.687" height="77.0792" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dx="-7.0864" dy="-1.7716"/>
<feGaussianBlur stdDeviation="10.6296"/>
<feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
<feColorMatrix type="matrix" values="0 0 0 0 0.811765 0 0 0 0 0.956863 0 0 0 0 0.941176 0 0 0 1 0"/>
<feBlend mode="normal" in2="shape" result="effect1_innerShadow_48_2671"/>
</filter>
<filter id="filter2_i_48_2671" x="66.3704" y="74" width="276.37" height="220.121" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dx="-10.6296" dy="1.7716"/>
<feGaussianBlur stdDeviation="17.716"/>
<feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
<feColorMatrix type="matrix" values="0 0 0 0 0.811765 0 0 0 0 0.956863 0 0 0 0 0.941176 0 0 0 0.8 0"/>
<feBlend mode="normal" in2="shape" result="effect1_innerShadow_48_2671"/>
</filter>
<filter id="filter3_dd_48_2671" x="128.568" y="171.438" width="100.981" height="111.611" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset/>
<feGaussianBlur stdDeviation="17.716"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.6 0"/>
<feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_48_2671"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset/>
<feGaussianBlur stdDeviation="2.6574"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.8 0"/>
<feBlend mode="normal" in2="effect1_dropShadow_48_2671" result="effect2_dropShadow_48_2671"/>
<feBlend mode="normal" in="SourceGraphic" in2="effect2_dropShadow_48_2671" result="shape"/>
</filter>
<filter id="filter4_f_48_2671" x="163.072" y="207.459" width="13.4721" height="24.0849" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
<feGaussianBlur stdDeviation="1.7716" result="effect1_foregroundBlur_48_2671"/>
</filter>
<filter id="filter5_dd_48_2671" x="189.687" y="171.438" width="100.981" height="111.611" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset/>
<feGaussianBlur stdDeviation="17.716"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.6 0"/>
<feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_48_2671"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset/>
<feGaussianBlur stdDeviation="2.6574"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.8 0"/>
<feBlend mode="normal" in2="effect1_dropShadow_48_2671" result="effect2_dropShadow_48_2671"/>
<feBlend mode="normal" in="SourceGraphic" in2="effect2_dropShadow_48_2671" result="shape"/>
</filter>
<filter id="filter6_f_48_2671" x="223.751" y="207.459" width="13.4721" height="24.0849" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
<feGaussianBlur stdDeviation="1.7716" result="effect1_foregroundBlur_48_2671"/>
</filter>
</defs>
</svg><div class="t-headbob"><div class="t-head"><svg width="100%" height="100%" viewBox="0 0 420 420" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" style="overflow:visible"><g><g filter="url(#filter2_i_48_2671)">
<path d="M342.74 206.87C342.74 280.252 283.252 292.35 209.87 292.35C136.488 292.35 77 280.252 77 206.87C77 133.488 136.488 74 209.87 74C283.252 74 342.74 133.488 342.74 206.87Z" fill="#34A8A8"/>
</g><g class="t-look"><g class="t-blink"><g filter="url(#filter3_dd_48_2671)">
<ellipse cx="179.059" cy="227.244" rx="15.0586" ry="20.3734" fill="#CFF4F0"/>
</g><g filter="url(#filter4_f_48_2671)">
<ellipse cx="169.808" cy="219.502" rx="2.58238" ry="8.70384" transform="rotate(13.0507 169.808 219.502)" fill="white"/>
</g><g filter="url(#filter5_dd_48_2671)">
<ellipse cx="240.178" cy="227.244" rx="15.0586" ry="20.3734" fill="#CFF4F0"/>
</g><g filter="url(#filter6_f_48_2671)">
<ellipse cx="230.487" cy="219.502" rx="2.58238" ry="8.70384" transform="rotate(13.0507 230.487 219.502)" fill="white"/>
</g></g></g><g class="t-closed"><g transform="translate(209.6185 227.244) scale(0.8858) translate(-249.569 -269.467)"><path d="M231.546 273.916C231.189 275.25 224.582 270.497 215.513 268.067C206.444 265.637 198.347 266.45 198.704 265.116C199.062 263.783 207.739 260.808 216.807 263.238C225.876 265.668 231.903 272.583 231.546 273.916Z" fill="#CFF4F0"/><path d="M300.171 265.133C300.529 266.467 292.431 265.654 283.362 268.084C274.293 270.514 267.687 275.266 267.33 273.933C266.972 272.599 272.999 265.684 282.068 263.254C291.137 260.824 299.814 263.799 300.171 265.133Z" fill="#CFF4F0"/></g></g></g><defs>
<filter id="hd_filter0_i_48_2671" x="57.6289" y="252.525" width="88.6906" height="77.0792" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dx="7.09" dy="-1.7716"/>
<feGaussianBlur stdDeviation="10.6296"/>
<feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
<feColorMatrix type="matrix" values="0 0 0 0 0.811765 0 0 0 0 0.956863 0 0 0 0 0.941176 0 0 0 1 0"/>
<feBlend mode="normal" in2="shape" result="effect1_innerShadow_48_2671"/>
</filter>
<filter id="hd_filter1_i_48_2671" x="274.675" y="252.525" width="88.687" height="77.0792" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dx="-7.0864" dy="-1.7716"/>
<feGaussianBlur stdDeviation="10.6296"/>
<feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
<feColorMatrix type="matrix" values="0 0 0 0 0.811765 0 0 0 0 0.956863 0 0 0 0 0.941176 0 0 0 1 0"/>
<feBlend mode="normal" in2="shape" result="effect1_innerShadow_48_2671"/>
</filter>
<filter id="hd_filter2_i_48_2671" x="66.3704" y="74" width="276.37" height="220.121" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dx="-10.6296" dy="1.7716"/>
<feGaussianBlur stdDeviation="17.716"/>
<feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
<feColorMatrix type="matrix" values="0 0 0 0 0.811765 0 0 0 0 0.956863 0 0 0 0 0.941176 0 0 0 0.8 0"/>
<feBlend mode="normal" in2="shape" result="effect1_innerShadow_48_2671"/>
</filter>
<filter id="hd_filter3_dd_48_2671" x="128.568" y="171.438" width="100.981" height="111.611" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset/>
<feGaussianBlur stdDeviation="17.716"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.6 0"/>
<feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_48_2671"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset/>
<feGaussianBlur stdDeviation="2.6574"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.8 0"/>
<feBlend mode="normal" in2="effect1_dropShadow_48_2671" result="effect2_dropShadow_48_2671"/>
<feBlend mode="normal" in="SourceGraphic" in2="effect2_dropShadow_48_2671" result="shape"/>
</filter>
<filter id="hd_filter4_f_48_2671" x="163.072" y="207.459" width="13.4721" height="24.0849" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
<feGaussianBlur stdDeviation="1.7716" result="effect1_foregroundBlur_48_2671"/>
</filter>
<filter id="hd_filter5_dd_48_2671" x="189.687" y="171.438" width="100.981" height="111.611" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset/>
<feGaussianBlur stdDeviation="17.716"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.6 0"/>
<feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_48_2671"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset/>
<feGaussianBlur stdDeviation="2.6574"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.8 0"/>
<feBlend mode="normal" in2="effect1_dropShadow_48_2671" result="effect2_dropShadow_48_2671"/>
<feBlend mode="normal" in="SourceGraphic" in2="effect2_dropShadow_48_2671" result="shape"/>
</filter>
<filter id="hd_filter6_f_48_2671" x="223.751" y="207.459" width="13.4721" height="24.0849" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
<feGaussianBlur stdDeviation="1.7716" result="effect1_foregroundBlur_48_2671"/>
</filter>
</defs>
</svg></div></div></div>
  </div>`
