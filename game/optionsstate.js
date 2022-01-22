/*
    Gameplay:
        Volume, Test Button
    Level Saves:
        Export ALL levels, Import ALL levels, Clear All Levels
    Campaign Save:
        Export Save, Import Save, Reset Save
*/

class OptionsState extends State{
    constructor(){
        super();
        let stage = new PIXI.Container();
        this.stage = stage;
        this.windowTitle = "Options";

        let bg = new PIXI.Graphics();
        stage.addChild(bg);
        fillRect(bg, "main0", 0, 0, DIM.w, DIM.h);

        let base = new Base(0, 0, DIM.w - 40, DIM.h - 40);
        moveCenterTo(base, DIM.w/2, DIM.h/2);
        stage.addChild(base);

        //create name + horizontal divider
        let section_width = DIM.w - 80;
        let text_offset = 40;

        let createSection = function(name, y, h){
            let section = new PIXI.Container();
            section.position.set(20, y);

            let divider = new PIXI.Graphics();
            drawDivider(divider, "box", 0, 0, section_width, h);
            section.addChild(divider);

            let text = printText(name, "windows", 0x000000, 2, text_offset, 0);
            text.anchor.set(0, 0.5);
            section.addChild(text);
            
            let bw = text.textWidth * 2;
            let bh = text.textHeight;
            let gap = 8;
            divider.beginFill(PALETTE.main1)
            .drawRect(text_offset - gap - 2, 0, bw + gap * 2, bh);

            base.addChild(section);
            return section;
        };

        let placeButtons = function(section, names, x0, y0, bw, bh, gap){
            let buttons = [];
            let x = x0;
            for (let name of names){
                let butt = new Button(x, y0, bw, bh);
                butt.addCentered(printText(name, "arcade", 0x000000, 1));
                butt.hoverGuard = false;
                buttons.push(butt);
                section.addChild(butt);
                x += bw + gap;
            }
            return buttons;
        };

        let sec_h = 156;
        let sec_y = 20;
        let sec_dy = sec_h + 26;

        
        /*****************
		* General Section*
		*****************/
        let section = createSection("General", sec_y, sec_h);
        sec_y += sec_dy;
        //Volume Slider
        let y = 20;
        let initialVolume = Number(localStorage.getItem("volume"));
        let volumeSlider = new Slider(this, 130, y+2, 300, 24, 100, initialVolume);
        this.volumeSlider = volumeSlider;
        section.addChild(volumeSlider);
        section.addChild(printText("Volume:", "windows", 0x000000, 2, 20, y));
        let volumeTest = new Button(520, y, 100, 30);
        volumeTest.addCentered(printText("Test", "arcade", 0x000000, 1));
        volumeTest.hoverGuard = false;
        let flipFlag = false;
        volumeTest.onClick = () => {
            PIXI.sound.volumeAll = volumeSlider.value / 100;
            if (flipFlag)
                playSound2("brick_hit");
            else
                playSound2("paddle_hit");
            flipFlag = !flipFlag;
        };
        section.addChild(volumeTest);
        //Enable Right Click
        y += 50;
        let enable = localStorage.getItem("enable_right_click") === "1";
        let contextCheck = new Checkbox(20, y,enable, (value) => {
            ENABLE_RIGHT_CLICK = value;
            localStorage.setItem("enable_right_click", value ? "1" : "0"); 
        });
        let text = "Always allow right-click context menu";
        text += "\n(Will make editing levels harder)";
        let label = printText(text, "windows", 0x000000, 1);
        contextCheck.addLabel(label);
        section.addChild(contextCheck);


        /*********************
		* User Levels Section*
		**********************/
        section = createSection("User Levels", sec_y, sec_h);
        sec_y += sec_dy;
        let names = [
            "Export\nAll User\nLevels",
            "Import\nUser\nLevels", 
            "Delete\nAll User\nLevels"
        ];
        let buttons = placeButtons(section, names, 20, 40, 130, 72, 30);

        //export user levels button
        buttons[0].onClick = () => {
            let dialogue = new DialogueBox(600, 400, "Export All User Levels");
            let input = dialogue.addTextArea(550, 250, 12);
            input.htmlInput.readOnly = true;
            input.text = levels.user.toString(true);
            // input.text = levels.default.toString(true); //for debugging
            dialogue.addButton("Back", 100, 40, () => {
                game.pop();
            });
            game.push(dialogue);
        };

        //import user levels button
        buttons[1].onClick = () => {
            let dialogue = new DialogueBox(600, 400, "Import User Levels");
            let input = dialogue.addTextArea(550, 250, 12);

            let status = printText("Test", "arcade", 0x000000, 1, 12, 280);
            status.visible = false;
            dialogue.add(status);

            dialogue.addButton("Back", 100, 40, () => {
                game.pop();
            });

            function mergeLevels(newList){
                levels.user.merge(newList);
                levels.user.save("user_levels");
                status.visible = true;
                status.text = "Successfully Imported Levels!";
                status.tint = PALETTE["status_green"];
            }

            dialogue.addButton("Import", 100, 40, () => {
                let list = null;
                try{
                    list = JSON.parse(input.text);
                } catch(err) {
                    status.visible = true;
                    status.text = "ERROR: Invalid JSON String";
                    status.tint = PALETTE["status_red"];
                }
                if (!list)
                    return;
                let conflicts = levels.user.mergeConflicts(list);
                if (conflicts.length == 0)
                    mergeLevels(list);
                else{
                    //create another dialogue box that prints out all the conflicts
                    let dialogue2 = new DialogueBox(600, 400, "Import Override Warning");
                    dialogue2.showUnderlay = 2;
                    dialogue2.setMessage("These levels already exist and will be overriden. Are you sure you want to continue?");
                    let input2 = dialogue2.addTextArea(550 , 200, 12, 80);
                    input2.text = conflicts.join("\n");
                    input2.htmlInput.readOnly = true;
                    dialogue2.addButton("Cancel", 100, 40, () => {
                        game.pop();
                        input.text = storedText;
                    });
                    //temporarily hide the long string since it somehow bled out of bounds, causing a WebGL error
                    let storedText = ""; 
                    dialogue2.addButton("Yes", 100, 40, () => {
                        game.pop();
                        input.text = storedText;
                        mergeLevels(list);
                    });
                    storedText = input.text;
                    input.text = "";
                    game.push(dialogue2);
                }
            });            
            game.push(dialogue);
        };

        //clear all user levels button
        buttons[2].onClick = () => {
            let dialogue = new DialogueBox(450, 200, "Confirm Clear all User Levels");
            dialogue.setMessage("Are you sure you want to delete all user levels?");
            dialogue.addButton("Cancel", 100, 40, () => {
                game.pop();
            });
            dialogue.addButton("Yes", 100, 40, () => {
                levels.user.clear();
                levels.user.save("user_levels");
                game.pop();
            });
            game.push(dialogue);
        };


        /***********************
		* Campaign Save Section*
		************************/
        section = createSection("Campaign Save", sec_y, sec_h);
        names = [
            "Export\nCampaign\nSave",
            "Import\nCampaign\nSave",
            "Reset\nCampaign\nSave"
        ];
        buttons = placeButtons(section, names, 20, 40, 130, 72, 30);

        //export campaign save
        buttons[0].onClick = () => {
            let dialogue = new DialogueBox(450, 250, "Export Campaign Save");
            let input = dialogue.addTextArea(400, 100, 16);
            input.htmlInput.readOnly = true;
            input.text = JSON.stringify(campaign_save.data);
            dialogue.addButton("Back", 80, 40, () => {
                game.pop();
            });
            game.push(dialogue);
        };

        //import campaing save
        buttons[1].onClick = () => {
            let dialogue = new DialogueBox(450, 250, "Import Campaign Save");
            let input = dialogue.addTextArea(400, 100, 16);

            let status = printText("null", "arcade", 0x000000, 1, 12, 125);
            status.visible = false;
            dialogue.add(status);

            dialogue.addButton("Back", 100, 40, () => {
                game.pop();
            });
            dialogue.addButton("Import", 100, 40, () => {
                let obj = null;
                try{
                    obj = JSON.parse(input.text);
                } catch(err){
                    status.visible = true;
                    status.text = "ERROR: Invalid JSON String";
                    status.tint = PALETTE["status_red"];
                }
                if (obj === null)
                    return;
                let dialogue2 = new DialogueBox(450, 250, "Confirm Campaign Override");
                dialogue2.showUnderlay = 2;
                dialogue2.setMessage("Are you sure you want to override your current campaign save?");
                dialogue2.addButton("Cancel", 100, 40, () => {
                    game.pop();
                });
                dialogue2.addButton("Yes", 100, 40, () => {
                    game.pop();
                    campaign_save.importStr(input.text); //load() takes in a string
                    status.visible = true;
                    status.text = "Successfully Loaded Save!";
                    status.tint = PALETTE["status_green"];
                });
                game.push(dialogue2);
            });
            game.push(dialogue);
        };

        //reset campaign save
        buttons[2].onClick = () => {
            let dialogue = new DialogueBox(450, 200, "Confirm Reset Campaign Save");
            dialogue.setMessage("Are you sure you want to reset your campaign progress?");
            dialogue.addButton("Cancel", 100, 40, () => {
                game.pop();
            });
            dialogue.addButton("Yes", 100, 40, () => {
                campaign_save.reset();
                game.pop();
            });
            game.push(dialogue);
        };

        //back button
        let gap = 30;
        let bw = 100;
        let bh = 40;
        this.backButton = new Button(base.width - bw - gap, base.height - bh - gap, bw, bh);
        this.backButton.addCentered(printText("Back", "arcade", 0x000000, 1));
        this.backButton.onClick = () => {game.pop();};
        base.addChild(this.backButton);
    }

    destructor(){
        super.destructor();
        //save the volume settings on exit
        let volume = this.volumeSlider.value;
        PIXI.sound.volumeAll = volume / 100;
        localStorage.setItem("volume", String(volume));
    }
}