const containerStyle = `{
  position: relative;
  cursor: pointer;
}`

// :after
const copyStyle = `{
  content: ' ';
  position: absolute;
  top: 0;
  right: 0;
  display: inline-block;
  visibility: hidden;
  width: 10px;
  height: 10px;
  background-size: contain;
  background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAYAAACtWK6eAAAAAXNSR0IArs4c6QAADuNJREFUeF7tnX+MHVUVx8+dTSOsgCHRmPDLZEH8owqRYmKhGBGiKUHUoEQw0IgRSqj9p/vu7JIaHip0585u/ygLFBSUaiBqhBASiKYEIwX+gBollgTFmvArIZqQAl0S2jfHTNjFUtvu3Lvve/ft3O8m/e+cM+d87nw6b957c58R/pEACRyWgCEbEiCBwxOgIDw7SOAIBCgITw8SoCA8B0ggjACvIGHcmJUIAQqSyEJzzDACFCSMG7MSIUBBEllojhlGgIKEcWNWIgQoSCILzTHDCFCQMG7MSoTAwAuyadOm45ctWzZSVdWIqo6IyNGJrM1ijPmOMWZ3lmW79+3bt3t8fPyNxWhikI45cIJMTEx8ZGhoaJWqfkFEviYinxokYIn18oKIPGSM+VOv19sxNja2J7H5ZWAE6Xa7xwwPD68TkfrfiaktxBKY91URmZ6ZmZnudrtvL4F++9LiQAhSFMVaY0wtxvK+TMUiSAK7VHU6z/OtyIMMSu1FF8Q5d5+IXD4oQNhHYwL3W2uvaBy9RAMXVZCiKF4wxpy+RNkl37aq/j3P81bfIy6aIM65f4vIR5M/y5Y+gP9Yaz+29Mc49ASLIkhZlnep6vfbCjW1uYwxP+10Ote0ce7ogjjnfiwiG9sIM/GZfmKt/WHbGEQVZGJi4pwsy55sG0TO8x6BqqrOHRsbe6pNPKIKwnes2nTqHHKW1r2zFU2QycnJ1VVVPdL6UyTxAbMsu2h0dPTRtmCIJohz7l4Ruaot4DjHYQlss9auaQufmILUX1U4wRecqr4uImVVVTuzLNuZ5/lbvjUY34xAURTHVlW1IsuyFSLSMcZ8vFnmB6Jes9a25qtCUQRxzp0rIjsCYP/WWntZQB5T+kDAOfcbEflWQKlV1tpWvBkTRZCiKLrGmBt9QBtjHu10Ohf55DC2/wTKsnxEVVf7VFbVm/I87/rkDGpsFEFC7j+yLDt7dHR056CCS6WvycnJFVVVPes5b2vuQ6IIUpblE6q6ygPyLmvtpz3iGQok4Jz7m883rY0xOzqdznnAlqKVjiKIc873Bp33HtFOgfkPFHAv0pob9ViC6PzL8L+INr2G9Zl7UGND7iGttVHOLTSzKEM45ygIeiWB9SkIEG5dmoKAAYPLUxAwYAoCBgwuT0HAgCkIGDC4PAUBA6YgYMDg8hQEDJiCgAGDy1MQMGAKAgYMLk9BwIApCBgwuDwFAQOmIGDA4PIUBAyYgoABg8tTEDBgCgIGDC5PQcCAKQgYMLj8Ygly5513LtuzZ89n3n333dc3btxYf+E1+h+/ixUd+dI7YGxBnHPXqOoaY0z96O+HZon9U0Qes9ZeG5MgBYlJe4keK6YgTZ5gzLJs+ejo6PMxcFKQGJSX+DFiCVKW5TdU9YEGuKI9UEdBGqxG6iExBJn9AaW/iMipTXjHemaIgjRZjcRjYgjiuy2tMebhTqdzCXppKAiacAvqxxBk9lfG7vDAFeWx3lYKUpblSlW9UkS+KiIneUAf5NAZEXlaRB7sdDq3G2O8ntJcyGCRBPHeGirGY72tEqTb7R41PDx8m4hcvZATYgnk7q2q6uqxsbF6Yzf4HwUBI471QaFz7u4E5DhwtVZYa/8MXj6hIGDCMQSZmpr6fK/Xq1+CpPT3O2vtN9EDUxAw4RiCOOduF5HrwKMMXPmhoaFTNmzY8DKyMQqCpBtpVxPnXH2StOWG3GdF1lhrt/kk+MZSEF9invGRriB7RWTYs7U2hOfWWocchIIg6ca7gmwXkQvAowxceVX9Up7njyMboyBIuvEEuV5EpsGjDFz5GJ8FUBDwssd4iaWqZnJy8k1VPQY8zsCUN8Zs6HQ6m9ENURAw4RiC1CM45+pfQ4ry4RkYWZPy9bMRFzYJXGgMBVkowXnyYwkyK8lZInKDiFwKHmvRyse6cswNSEHASx1TkLlRpqamTu71euer6gh4vCjljTEzqvoM+ob8UMNQEPASL4Yg4JGSKk9BwMtNQcCAweUpCBgwBQEDBpenIGDAFAQMGFyegoABUxAwYHB5CgIGTEHAgMHlKQgYMAUBAwaXpyBgwBQEDBhcnoKAAVMQMGBweQoCBkxBwIDB5SkIGDAFAQMGl6cgYMAUBAwYXJ6CgAFTEDBgcHkKAgZMQcCAweUpCBgwBQEDBpenIGDAFAQMGFyegoABUxAwYHB5CgIGTEHAgMHlKQgY8GII4py73Bhzgaoun/3Vol3gMQet/FEi8rwx5rFOp3PfQpqjIAuh1yA3piBlWV6rqlsbtJVUiKpel+d5EBcKAj5VYglSFMW4MeYW8DhLtryqbszz/GbfASiILzHP+BiCFEVxkjEGusu559gDGV5V1SfGxsZe8mmOgvjQCoiNJIj3T3gFjNKGlB9Za2/0GYSC+NAKiI0kyAvGmNMD2ksqRVVfzPP8kz5DUxAfWgGxMQRxzu0XkaGA9lJLUWtt5jM0BfGhFRAbQ5CiKHgFabA2vII0gHRASGt+5bYsyxtVtes3fpLRvAfxWPbWCMJ3sZqtOt/FasZpLqo1gtQD8XOQIy8+Pwfxk6OObpUg9UD8JP3QJwE/SfeXo5WCzGHgd7GE38UKc+IDWa27gvSBCUscRIBv84JPiRhv84JHSLo8BQEvPwUBAwaXpyBgwBQEDBhcnoKAAVMQMGBweQoCBkxBwIDB5SkIGDAFAQMGl6cgYMAUBAwYXJ6CgAFTEDBgcHkKAgZMQcCAweUpCBgwBQEDBpenIGDAFAQMGFyegoABUxAwYHB5CgIGTEHAgMHlKQgYMAUBAwaXpyBgwBQEDBhcnoKAAVMQMGBweQoCBkxBwIDB5SkIGPBiCDI1NXVyr9c7X1VHwOMNcvl/qerjvnvxHjwQBQEvcUxBnHNnicgNInIpeKwlU94Y88D+/ftvGR8f3xnSNAUJoeaRE0uQiYmJy7Is+7VHa6mFftta682HgoBPkxiCqKopy/ItEfkweJylXH5vp9M51hijPkNQEB9aAbExBHHOXS8i0wHtpZayzlp7m8/QFMSHVkBsJEG2i8gFAe2llvKYtfZCn6EpiA+tgNhIguwVkeGA9lJLmbHWer0MpSDgUySSIPXPr50EHqUN5V+x1p7sMwgF8aEVEBtDkKIo7jDGrA1oL7WUrdba63yGpiA+tAJiYwhSluVKVX0qoL2kUowx53Q6nad9hqYgPrQCYmMIUrdVluU9qvrdgBZTSfmFtdabDwUBnx6xBNm8efPRvV7vNkry/wtqjPn53r1713W73Rnf5aYgvsQ842MJMtdW/XKrqqqrjDEXJ37j/oqIPGyM+aXvy6oDl5iCeJ7wvuGxBfHtj/FHJkBBwGcIBQEDBpenIGDAFAQMGFyegoABUxAwYHB5CgIGTEHAgMHlKQgYMAUBAwaXpyBgwBQEDBhcnoKAAVMQMGBweQoCBkxBwIDB5SkIGDAFAQMGl6cgYMAUBAwYXJ6CgAFTEDBgcHkKAgZMQcCAweUpCBgwBQEDBpenIGDAFAQMGFyegoABUxAwYHB5CgIGTEHAgMHlKQgYMAUBAwaXpyBgwBQEDBhcnoKAATvnXhWRE5oeZvYZ6quaxjMOS6Asy22qeqXHUV6z1p7oES8xJPTpZy7WhCT55pRl+YSqrvLIe85ae6ZHPEOBBJxzfxWRM5oewhizo9PpnNc0vo5LWhDn3L0i4ntF+Iq19g8+kBnbfwLOuS+LyO89K2+z1q7xyUlakJDhRYRXEZ8zDBTre/Wo21DVm/I87/q0FHKOWGvhr4DgB5i9fJ5tjHnGB9hs7K3W2vUBeUzpAwHn3BYR+YFvKVX9XJ7nz/rkJS1IDco595KIeO0qPvu/0YsicpeqPjc8PPz0+vXr3/QBz9jmBLZs2XLczMzMSmNMfb9xjTHmtObZ70e+bK09xTePgjh3t4hc7QuO8UuOwD3W2u/5dp28IJOTk6urqnrEFxzjlxaBLMsuGh0dfdS36+QFmX2ZdZ+IXO4Lj/FLhsD91torQrqlICIyMTFxTpZlT4YAZM7gE6iq6tyxsbGg32ihILPr65ybFJENg7/c7NCTwJS1dtQz5/1wCnIAOefc4yLyxVCYzBs4An+01p6/kK4oyEH0nHP127XHLgQqcweCwFvW2uMW2gkFOQTBoiieMMb4fEdroevA/D4SUNUdeZ57fefqcIenIIch45wrRST4tWsf15ul/AhMWms7fimHj6YgRyBZFMVaY8w6EVneL+CsAyOwS1Wn8zzf2s8jUJB5aHa73WOGh4drSep/Xs8S9HOhWOuwBOpneqZnZmamu93u2/3mREEaEt20adPxQ0NDF4rI3L+RhqkM6z+B3SKyvf7X6/W2j4+Pv9H/Q7xXkYIEkq2FWbZs2UhVVSOqWstydGApps1P4B1jzO4sy3bv27dvN1KIg1uhIPMvDiMSJkBBEl58jj4/AQoyPyNGJEyAgiS8+Bx9fgIUZH5GjEiYAAVJePE5+vwEKMj8jBiRMIEYm9OF4I2yq0lIY8xJi4Dv9kIhm9OFEKUgIdSY01cCsTanC2magoRQY05fCfhePeqDh2xOF9I0BQmhxpy+EYi5OV1I0xQkhBpzggks5uZ0IU0nJYhz7mJVXW2M+ayIrAwBxpyBIBC0OV1I58kI4pz7lYh8JwQScwaLQOjmdCFTJCFIURRXGmO2hQBizsARCN6cLmSS1gtSluUZqlr/AAz/WkBgIZvThYyfgiDrVPXWEDjMGTgCC9qcLmSaFAT5map67zYeApM5UAIL3pwupLvWC+Kce0hELgmBw5yBIdCXzelCpklBkBtE5OYQOMxZfAL93JwuZJrWC1IUxdeNMQ+GwGHOohPo6+Z0IdO0XpAainOu/r28FSGAmLMoBCCb04VMkoQgmzdvPm3//v3/CAHEnKgEoJvThUyShCA1mNmdG+t9gNeGgGIOjEC0zelCJkhGkDk4zrlT619xrarqzBBgzFkwgUXbnC6k8+QECYHEnHQJUJB0156TNyBAQRpAYki6BChIumvPyRsQoCANIDEkXQIUJN215+QNCFCQBpAYki4BCpLu2nPyBgQoSANIDEmXAAVJd+05eQMCFKQBJIakS4CCpLv2nLwBgf8CMkWjX/TSZhAAAAAASUVORK5CYII=);
}`

// :hover:after
const copyHoverStyle = `{
  visibility: visible;
}`

// .sss-copied:after
const copiedStyle = `{
  background-image: url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/PjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+PHN2ZyB0PSIxNjk1MTM5MjIzMTM2IiBjbGFzcz0iaWNvbiIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHAtaWQ9IjkzMDYiIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCI+PHBhdGggZD0iTTgwNi4wMTYgMzIwTDY0MCAxNTMuOTg0VjMyMGgxNjYuMDE2ek04MzIgMzg0aC0yNTZWMTI4SDE5MnY3NjhoNjQwVjM4NHpNMTYwIDY0aDQ4MGwyNTYgMjU2djYwOHEwIDE0LjAxNi04Ljk5MiAyMy4wMDhUODY0IDk2MEgxNjBxLTE0LjAxNiAwLTIzLjAwOC04Ljk5MlQxMjggOTI4Vjk2cTAtMTQuMDE2IDguOTkyLTIzLjAwOFQxNjAgNjR6IG0zMTguMDE2IDU4Mi4wMTZsMTgwLjk5Mi0xODAuOTkyIDQ2LjAxNiA0NC45OTItMjI3LjAwOCAyMjcuMDA4TDMyMCA1NzguMDE2bDQ0Ljk5Mi00NC45OTJ6IiBwLWlkPSI5MzA3IiBmaWxsPSIjNjdDMjNBIj48L3BhdGg+PC9zdmc+);
}`

function generateCSS(selectorList) {
  let cssStr = ''
  cssStr += geneClass(selectorList, '') + containerStyle
  cssStr += geneClass(selectorList, ':after') + copyStyle
  cssStr += geneClass(selectorList, ':hover:after') + copyHoverStyle
  cssStr += geneClass(selectorList, '.sss-copied:after') + copiedStyle
  return cssStr
}

function geneClass(classList, str = '') {
  const len = classList.length
  return classList.reduce((cur, acc, curIndex) => cur + acc + str + (curIndex === len - 1 ? '' : ','), '')
}

export default generateCSS
