/**
 * Created by Sun on 11/24/2014.
 */
var gridHeight = 15, gridWidth = 15;
var players = null;
var grid = null;
var turn = -1;
var round = 0;
var compassHolder = null;
var PLAYER_STATUS = {OK: "ok", STUCK: "stuck", DEAD: "dead", PRISON: "prison"};
var keymap = {32: "space", 37: "left", 38: "up", 39: "right", 40: "down", 77: "mage", 87: "warrior", 84: "thief", 67: "cleric"};
var GRID_VALUES = {EMPTY: "_", ENTRANCE: "E", WALL: "W", TREASURE: "T", COMPASS: "C",
	FIRE: "F", PITFALL: "P", SPIKES: "S", MAZE_MAKER: "M", WARP: "@",
	PRISON_1: "1", PRISON_2: "2", PRISON_3: "3", PRISON_4: "4"
};

var mage = {class: "mage", fatal: "pitfall", immune: "fire"};
var warrior = {class: "warrior", fatal: "spikes", immune: "pitfall"};
var thief = {class: "thief", fatal: "fire", immune: "spikes"};
var cleric = {class: "cleric", fatal: "none", immune: "none"};
var startConditions = {status: PLAYER_STATUS.OK, warp: 0};
var maker = null;
var treasure = null;

$(function () {
	$("#play").click(function () {
		players = [];
		maker = {};
		treasure = {};
		if ($("input#m")[0].checked) players.push($.extend({}, mage, startConditions));
		if ($("input#w")[0].checked) players.push($.extend({}, warrior, startConditions));
		if ($("input#t")[0].checked) players.push($.extend({}, thief, startConditions));
		if ($("input#c")[0].checked) players.push($.extend({}, cleric, startConditions));
		shuffle(players);
		initMaze($("#csv").val());
		turn = 0;
		round = 1;
		$("input#moves").val(0);
		updateGameState();
	});
	$("#roll").click(function () {
		if ($("input#moves").val() * 1 > 0) return;
		if (turn < players.length) {
			$("input#moves").val(Math.ceil(Math.random() * 6));
		}
	});
	$("#reveal").click(function () {
		$("table.maze td:not(.visible)").addClass("hidefog visible");
		$("table.maze td.maker").addClass("initial");
	});
	$(document).keydown(function (e) {
		//console.log(e.which);
		if (players != null && turn == players.length) {
			$("table.maze td.hidefog").removeClass("hidefog visible");
			$("table.maze td.maker").removeClass("initial");
			var valid = true;
			switch (keymap[e.which]) {
				case "space":
					maker.row = maker.rowTemp;
					maker.col = maker.colTemp;
					advanceTurn();
					break;
				case "left":
					if (maker.colTemp > 0 && maker.colTemp >= maker.col)
						maker.colTemp--;
					break;
				case "right":
					if (maker.colTemp < gridWidth - 1 && maker.colTemp <= maker.col)
						maker.colTemp++;
					break;
				case "up":
					if (maker.rowTemp > 0 && maker.rowTemp >= maker.row)
						maker.rowTemp--;
					break;
				case "down":
					if (maker.rowTemp < gridHeight - 1 && maker.rowTemp <= maker.row)
						maker.rowTemp++;
					break;
				case "mage":
				case "warrior":
				case "thief":
				case "cleric":
					if (getCell(maker.rowTemp, maker.colTemp).hasClass(keymap[e.which])) {
						for (var p in players) {
							if (players[p].class == keymap[e.which]) {
								if (players[p].status == PLAYER_STATUS.OK) {
									putInPrison(players[p]);
									updatePlayer(players[p]);
									advanceTurn();
								}
								break;
							}
						}
					}
					break;
				default :
					valid = false;
					break;
			}
			if (valid) {
				e.preventDefault();
				updateGameState();
			}
		}
	});
});

function initMaze(csv) {
	grid = csv.split("\n");
	gridHeight = grid.length;
	for (var row in grid) {
		grid[row] = grid[row].split(",");
		gridWidth = grid[row].length;
	}
	var maze = $("<table class='maze'></table>");
	for (var i = 0; i < gridHeight; i++) {
		var row = $("<tr></tr>");
		for (var j = 0; j < gridWidth; j++) {
			var cell = $("<td class=''><a class='a'></a><a class='b'></a><br><a class='c'></a><a class='d'></a></td>");
			switch (grid[i][j]) {
				case "M":
					cell.addClass("maker initial");
					maker.row = i; maker.col = j;
					maker.rowTemp = i; maker.colTemp = j;
					break;
				case "W":
					cell.addClass("wall");
					break;
				case "T":
					cell.addClass("treasure");
					treasure.row = i; treasure.col = j;
					break;
				case "@":
					cell.addClass("warp");
					break;
				case "C":
					cell.addClass("compass");
					break;
				case "F":
					cell.addClass("fire");
					break;
				case "P":
					cell.addClass("pitfall");
					break;
				case "S":
					cell.addClass("spikes");
					break;
				case "E":
					for (var p in players) {
						cell.addClass(players[p].class);
						players[p].row = i; players[p].col = j;
					}
					break;
				case "1":
				case "2":
				case "3":
				case "4":
					cell.addClass("prison");
					break;
				default :
					break;
			}
			if (i == 0) cell.append("<span class='top'>" + (j + 1) + "</span>");
			if (j == 0) cell.append("<span class='left'>" + (i + 1) + "</span>");
			if (i == gridHeight - 1) cell.append("<span class='bottom'>" + (j + 1) + "</span>");
			if (j == gridWidth - 1) cell.append("<span class='right'>" + (i + 1) + "</span>");
			cell.addClass("fog");
			row.append(cell);
			cell.bind("click", [i, j], cellClicked);
		}
		maze.append(row);
	}
	$("div.maze-container").empty().append(maze);
}

function cellClicked(e) {
	if (turn < 0) return;
	if (turn < players.length) {
		var moves = $("input#moves").val() * 1;
		if (moves == 0) return;
		var playerCell = getCell(e.data[0], e.data[1]);
		if (playerCell.hasClass("wall")) return;
		var player = players[turn];
		if (e.data[0] == player.row && e.data[1] == player.col) {
			if (playerCell.hasClass("stuck") || (player.class == "cleric" && playerCell.hasClass("dead"))) {
				playerCell.removeClass("stuck dead");
				moves--;
				for (var p in players)
					if (e.data[0] == players[p].row && e.data[1] == players[p].col)
						players[p].status = PLAYER_STATUS.OK;
			} else {
				if (compassHolder == null) return;
				var playersHere = [];
				var playerWithCompass = -1;
				for (var p in players)
					if (e.data[0] == players[p].row && e.data[1] == players[p].col) {
						playersHere.push(players[p]);
						if (players[p] == compassHolder) playerWithCompass = playersHere.length;
					}
				if (playerWithCompass < 0) return;
				if (playersHere.length < 2) return;
				if (playerWithCompass == playersHere.length) playerWithCompass = 0;
				compassHolder = playersHere[playerWithCompass];
			}
		} else if ((e.data[0] == player.row || e.data[1] == player.col) &&
			Math.abs(e.data[1] - player.col) <= 1 && Math.abs(e.data[0] - player.row) <= 1
		) {
			player.row = e.data[0];
			player.col = e.data[1];
			moves--;
			updatePlayer(player);
			if (player.status != PLAYER_STATUS.OK) {
				moves = 0;
			}
		} else return;
		$("input#moves").val(moves);
		if (moves == 0) advanceTurn();
		updateGameState();
	} else {
		$("table.maze td.hidefog").removeClass("hidefog visible");
		$("table.maze td.maker").removeClass("initial");
		if (Math.abs(e.data[1] - maker.col) <= 1 && Math.abs(e.data[0] - maker.row) <= 1) {
			maker.rowTemp = e.data[0];
			maker.colTemp = e.data[1];
		}
	}
}

function advanceTurn() {
	if (turn >= 0 && turn < players.length) players[turn].warp--;
	turn++;
	if (turn < players.length) {
		if (players[turn].status != PLAYER_STATUS.OK) {
			advanceTurn();
		}
	} else if (turn > players.length) {
		turn = -1;
		round++;
		advanceTurn();
	}
}

function getCell(row, col) {
	if (row < 0 || row >= gridHeight || col < 0 || col >= gridWidth) return $();
	return $($("table.maze tr")[row].children[col]);
}

function updateGameState() {
	for (var p in players) {
		updatePlayer(players[p]);
	}
	updateMaker();
	updateFog();
	updateCompass();
	updateGameStatus();
}

function updateFog() {
	for (var p in players) {
		if (players[p].status != PLAYER_STATUS.PRISON) {
			getCell(players[p].row - 1, players[p].col).removeClass("fog");
			getCell(players[p].row + 1, players[p].col).removeClass("fog");
			getCell(players[p].row, players[p].col - 1).removeClass("fog");
			getCell(players[p].row, players[p].col + 1).removeClass("fog");
			if (!getCell(players[p].row - 1, players[p].col).hasClass("wall") || !getCell(players[p].row, players[p].col + 1).hasClass("wall"))
				getCell(players[p].row - 1, players[p].col + 1).removeClass("fog");
			if (!getCell(players[p].row - 1, players[p].col).hasClass("wall") || !getCell(players[p].row, players[p].col - 1).hasClass("wall"))
				getCell(players[p].row - 1, players[p].col - 1).removeClass("fog");
			if (!getCell(players[p].row + 1, players[p].col).hasClass("wall") || !getCell(players[p].row, players[p].col + 1).hasClass("wall"))
				getCell(players[p].row + 1, players[p].col + 1).removeClass("fog");
			if (!getCell(players[p].row + 1, players[p].col).hasClass("wall") || !getCell(players[p].row, players[p].col - 1).hasClass("wall"))
				getCell(players[p].row + 1, players[p].col - 1).removeClass("fog");
		}
	}
}

function updateGameStatus() {
	$("#round").html("Round# " + round);
	if (turn < players.length) {
		$("input#reveal").css("visibility", "hidden");
		$("#game-status").html(players[turn].class + "'s<br>turn to move!");
	} else {
		$("input#reveal").css("visibility", "");
		$("#game-status").html("maze maker's<br>turn to move!");
	}
	var okPlayer = false;
	for (var p in players) {
		if (grid[players[p].row][players[p].col] == GRID_VALUES.TREASURE) {
			$("#game-status").html("GAME OVER<br>players win!");
			turn = -1;
			return;
		}
		if (players[p].status == PLAYER_STATUS.OK) okPlayer = true;
	}
	if (!okPlayer) {
		$("#game-status").html("GAME OVER<br>maze maker wins!");
		turn = -1;
	}
}

function updatePlayer(player) {
	var playerCell = getCell(player.row, player.col);
	if (player.status != PLAYER_STATUS.PRISON)
		playerCell.addClass("visible").removeClass("fog");
	switch (grid[player.row][player.col]) {
		case GRID_VALUES.FIRE:
		case GRID_VALUES.PITFALL:
		case GRID_VALUES.SPIKES:
			grid[player.row][player.col] = GRID_VALUES.EMPTY;
			if (playerCell.hasClass(player.fatal)) {
				player.status = PLAYER_STATUS.DEAD;
				playerCell.addClass("dead");
			} else if (!playerCell.hasClass(player.immune)) {
				player.status = PLAYER_STATUS.STUCK;
				playerCell.addClass("stuck");
			}
			break;
		case GRID_VALUES.WARP:
			if (player.warp <= 0) {
				player.warp = 2;
				for (var i = 0; i < gridHeight; i++) {
					for (var j = 0; j < gridWidth; j++) {
						if (i != player.row && j != player.col && grid[i][j] == GRID_VALUES.WARP) {
							player.row = i; player.col = j;
							updatePlayer(player);
							return;
						}
					}
				}
			}
			break;
		case GRID_VALUES.COMPASS:
			compassHolder = player;
			grid[player.row][player.col] = GRID_VALUES.EMPTY;
			break;
		default:
			break;
	}
	$("table.maze td").removeClass(player.class);
	playerCell.addClass(player.class);
}

function updateMaker() {
	$("table.maze td.maker").removeClass("maker LOS");
	if (getCell(maker.row, maker.col).addClass("maker").hasClass("wall")) return;
	for (var p in players) {
		if (players[p].status == PLAYER_STATUS.DEAD || players[p].status == PLAYER_STATUS.PRISON) continue;
		var rowDiff = Math.sign(maker.row - players[p].row);
		var colDiff = Math.sign(maker.col - players[p].col);
		if (rowDiff * colDiff == 0) {
			if (rowDiff + colDiff == 0) {
				getCell(maker.row, maker.col).addClass("LOS");
				return;
			}
			if (rowDiff == 0) rowDiff = 1;
			if (colDiff == 0) colDiff = 1;
			var hasWall = false;
			for (var i = players[p].row; i != maker.row + rowDiff; i += rowDiff) {
				for (var j = players[p].col; j != maker.col + colDiff; j += colDiff) {
					//console.log("checked " + i + " " + j);
					if (getCell(i, j).hasClass("wall")) hasWall = true;
				}
			}
			if (!hasWall) {
				getCell(maker.row, maker.col).addClass("LOS");
				break;
			}
		}
	}
}

var divisions = 8;
var prevAngle = null, currentAngle = null;
function updateCompass() {
	var needle = $("img#needle");
	needle.hide();
	if (compassHolder == null) {
		$("div#compass").html("");
	} else {
		$("div#compass").html(compassHolder.class + "<br>holds the compass");
		if (getCell(compassHolder.row, compassHolder.col).hasClass("visible")) {
			needle.show();
			var angle = Math.atan2(treasure.row - compassHolder.row, treasure.col - compassHolder.col);
			angle = Math.round(angle / (2 * Math.PI / divisions)) * (360 / divisions) + 0;
			if (prevAngle == null) prevAngle = angle;
			if (currentAngle == null) currentAngle = angle;
			if (Math.sign(angle) == Math.sign(prevAngle) || Math.sign(angle) == 0 || Math.sign(prevAngle) == 0) {
				currentAngle += (angle - prevAngle);
			} else {
				var way1 = angle - prevAngle;
				var way2 = way1 - 360 * Math.sign(angle);
				currentAngle += Math.abs(way1) < Math.abs(way2) ? way1 : way2;
			}
			prevAngle = angle;
			needle.css("transform", "rotate(" + currentAngle + "deg)");
		}
	}
}

function putInPrison(player) {
	var emptyPrisons = [];
	for (var i = 0; i < gridHeight; i++) {
		for (var j = 0; j < gridWidth; j++) {
			if (grid[i][j] >= GRID_VALUES.PRISON_1 && grid[i][j] <= GRID_VALUES.PRISON_4 && 
				!getCell(i, j).hasClass("stuck")) {
				emptyPrisons.push([i, j]);
			}
		}
	}
	shuffle(emptyPrisons);
	var row = emptyPrisons[0][0];
	var col = emptyPrisons[0][1];
	player.row = maker.row = maker.rowTemp = row;
	player.col = maker.col = maker.colTemp = col;
	player.status = PLAYER_STATUS.PRISON;
	getCell(row, col).addClass("stuck");
}

function shuffle(array) {
	var currentIndex = array.length, temporaryValue, randomIndex;

	// While there remain elements to shuffle...
	while (0 !== currentIndex) {

		// Pick a remaining element...
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;

		// And swap it with the current element.
		temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}

	return array;
}